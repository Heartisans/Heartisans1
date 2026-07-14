import json
import asyncio
from pathlib import Path
from PIL import Image
from curl_cffi.requests import AsyncSession
from playwright.async_api import async_playwright, BrowserContext
import pandas as pd
import logging
import argparse

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

class ImageDownloader:
    def __init__(self, dataset_path: str, max_concurrent: int = 5):
        self.dataset_path = Path(dataset_path)
        self.output_dir = self.dataset_path.parent / "images"
        self.output_dir.mkdir(parents=True, exist_ok=True)
        # Using a strict semaphore for Playwright to prevent out-of-memory
        self.semaphore = asyncio.Semaphore(max_concurrent)
        self.failed_downloads = []

    async def _download_image(self, session: AsyncSession, url: str, path: Path) -> bool:
        """Download raw image file."""
        try:
            response = await session.get(url, impersonate="chrome110", timeout=15)
            if response.status_code == 200:
                with open(path, 'wb') as f:
                    f.write(response.content)
                    
                # Verify it's a valid image
                try:
                    with Image.open(path) as img:
                        img.verify()
                    return True
                except Exception:
                    path.unlink() # Delete corrupted
                    return False
            return False
        except Exception:
            return False

    async def process_row(self, context: BrowserContext, session: AsyncSession, item_id: str, source_url: str) -> str:
        """Process a single row using Playwright to bypass Incapsula JS challenges."""
        target_path = self.output_dir / f"{item_id}.jpg"
        
        if target_path.exists():
            return "EXISTS"
            
        if not source_url or pd.isna(source_url) or source_url == "":
            self.failed_downloads.append({"id": item_id, "url": source_url, "reason": "NO_URL_PROVIDED"})
            return "FAILED_NO_URL"

        async with self.semaphore:
            page = await context.new_page()
            
            # Block unnecessary resources to speed up Playwright
            await page.route("**/*", lambda route: route.abort() if route.request.resource_type in ["media", "font", "stylesheet"] else route.continue_())
            
            try:
                # Wait until domcontentloaded so JS has a chance to run
                response = await page.goto(source_url, wait_until="domcontentloaded", timeout=20000)
                
                # Check if we are stuck on an Incapsula challenge (which has an iframe id="main-iframe")
                # We give it a few seconds to run the JS and redirect
                if await page.locator("iframe#main-iframe").count() > 0:
                    try:
                        await page.wait_for_selector("meta[property='og:image'], .item-image, img", timeout=10000)
                    except Exception:
                        pass # Ignore timeout, we will extract what we can
                
                # Try to extract og:image first, fallback to standard LiveAuctioneers image classes
                img_url = await page.evaluate('''() => {
                    const meta = document.querySelector('meta[property="og:image"]');
                    if (meta && meta.content) return meta.content;
                    
                    // Fallbacks for LiveAuctioneers / India Craft House
                    const mainImg = document.querySelector('img.item-image') || document.querySelector('.item-image img') || document.querySelector('.product-single__photo');
                    if (mainImg && mainImg.src) return mainImg.src;
                    
                    return null;
                }''')
                
                await page.close()
                
                if img_url:
                    # Download the image using curl_cffi for speed
                    success = await self._download_image(session, img_url, target_path)
                    if success:
                        return "SUCCESS"
                        
                self.failed_downloads.append({"id": item_id, "url": source_url, "reason": "NO_IMAGE_FOUND_OR_DOWNLOAD_FAILED"})
                return "FAILED_NO_IMAGE_FOUND"
                
            except Exception as e:
                await page.close()
                self.failed_downloads.append({"id": item_id, "url": source_url, "reason": "HTML_FETCH_FAILED_OR_BLOCKED"})
                return "FAILED_HTML_FAILED"

    async def run(self):
        """Main execution flow."""
        df = pd.read_csv(self.dataset_path)
        total = len(df)
        logger.info(f"Found {total} records. Checking images in {self.output_dir}...")
        
        results = {"SUCCESS": 0, "EXISTS": 0, "FAILED_NO_URL": 0, 
                   "FAILED_HTML_FAILED": 0, "FAILED_NO_IMAGE_FOUND": 0}

        async with async_playwright() as p:
            browser = await p.chromium.launch(headless=True)
            context = await browser.new_context(
                user_agent="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
                viewport={'width': 1920, 'height': 1080}
            )
            
            async with AsyncSession() as session:
                tasks = []
                for _, row in df.iterrows():
                    tasks.append(self.process_row(context, session, str(row['id']), row['source_url']))
                    
                    # Smaller batch size because Playwright uses massive RAM per page
                    if len(tasks) >= 20:
                        batch_results = await asyncio.gather(*tasks)
                        for r in batch_results:
                            results[r] += 1
                        tasks = []
                        
                        processed = sum(results.values())
                        logger.info(f"Processed {processed}/{total} | Success: {results['SUCCESS']} | Exists: {results['EXISTS']} | Failed: {results['FAILED_NO_URL'] + results['FAILED_HTML_FAILED'] + results['FAILED_NO_IMAGE_FOUND']}")

                if tasks:
                    batch_results = await asyncio.gather(*tasks)
                    for r in batch_results:
                        results[r] += 1
                        
            await browser.close()
                        
        # Save failed downloads to JSON
        failed_path = self.dataset_path.parent / "blocked_images.json"
        with open(failed_path, "w") as f:
            json.dump(self.failed_downloads, f, indent=4)
            
        logger.info(f"Done. {len(self.failed_downloads)} images failed/blocked. Recorded in {failed_path}.")

if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("dataset_path", type=str, help="Path to heartisans.csv")
    args = parser.parse_args()
    
    downloader = ImageDownloader(args.dataset_path)
    asyncio.run(downloader.run())
