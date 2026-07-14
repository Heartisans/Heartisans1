import React from 'react';

export const StoryCard = ({ id, name, role, image, profileImage, storyImage, story, rating, isAdmin, onDelete }) => {
  // Use profileImage if available, fallback to image, then default
  const displayProfileImage = profileImage || image || '/photos/default_icon.png';
  
  // Create star display based on rating
  const renderStars = (rating) => {
    const stars = [];
    for (let i = 1; i <= 5; i++) {
      stars.push(
        i <= rating ? '⭐' : '☆'
      );
    }
    return stars.join('');
  };

  return (
    <div className="bg-white rounded-3xl shadow-lg hover:shadow-2xl transition-all duration-300 p-6 md:p-8 lg:p-10 border-2 border-green-100 hover:border-green-200 w-full group">
      <div className="flex flex-col sm:flex-row items-start sm:items-center mb-6 lg:mb-8">
        <div className="relative mb-4 sm:mb-0">
          <img 
            src={displayProfileImage} 
            alt={name}
            className="w-16 md:w-20 lg:w-24 h-16 md:h-20 lg:h-24 rounded-full object-cover border-4 border-green-200 group-hover:border-green-300 transition-all duration-300 shadow-lg"
            onError={(e) => {
              e.target.src = '/photos/default_icon.png';
            }}
          />
          <div className="absolute -bottom-1 -right-1 w-6 md:w-8 h-6 md:h-8 bg-green-500 rounded-full flex items-center justify-center">
            <span className="text-white text-xs md:text-sm">✓</span>
          </div>
        </div>
        <div className="sm:ml-6 lg:ml-8 flex-1">
          <h3 className="text-xl md:text-2xl lg:text-3xl font-bold text-gray-800 mb-1 md:mb-2">{name}</h3>
          <div className="flex items-center mb-2">
            <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
            <p className="text-base md:text-lg lg:text-xl text-green-700 font-semibold">{role}</p>
          </div>
          {/* Rating Display */}
          {rating && (
            <div className="flex items-center">
              <span className="text-lg md:text-xl mr-2">{renderStars(rating)}</span>
              <span className="text-sm md:text-base text-gray-600">({rating}/5)</span>
            </div>
          )}
        </div>
      </div>
      
      <div className="relative mb-6">
        <div className="absolute top-0 left-0 text-4xl md:text-5xl lg:text-6xl text-green-200 leading-none">"</div>
        <p className="text-gray-700 leading-relaxed text-base md:text-lg lg:text-xl italic pl-6 md:pl-8 lg:pl-10 pr-4 md:pr-6 lg:pr-8 relative z-10">
          {story}
        </p>
        <div className="absolute bottom-0 right-0 text-4xl md:text-5xl lg:text-6xl text-green-200 leading-none transform rotate-180">"</div>
      </div>
      
      {/* Story Image Display */}
      {storyImage && (
        <div className="mb-6">
          <img
            src={storyImage}
            alt="Story experience"
            className="w-full h-48 md:h-64 lg:h-72 object-cover rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 cursor-pointer"
            onClick={() => {
              // Create modal for full image view
              const modal = document.createElement('div');
              modal.className = 'fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4';
              modal.innerHTML = `
                <div class="relative max-w-4xl max-h-full">
                  <img src="${storyImage}" alt="Story experience" class="max-w-full max-h-full object-contain rounded-lg">
                  <button class="absolute top-4 right-4 text-white text-3xl font-bold bg-black bg-opacity-50 rounded-full w-10 h-10 flex items-center justify-center hover:bg-opacity-75 transition-all duration-300" onclick="document.body.removeChild(this.parentElement.parentElement)">×</button>
                </div>
              `;
              document.body.appendChild(modal);
              modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                  document.body.removeChild(modal);
                }
              });
            }}
          />
          <div className="text-center mt-2">
            <span className="text-xs md:text-sm text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
              📸 Experience Photo
            </span>
          </div>
        </div>
      )}
      
      <div className="flex justify-between items-center">
        <div className="text-sm md:text-base lg:text-lg text-green-600 font-medium bg-green-50 px-3 md:px-4 py-1 md:py-2 rounded-full">
          Verified Review
        </div>
        <div className="flex gap-2">
          {isAdmin && (
            <button
              onClick={() => onDelete(id)}
              className="text-xs md:text-sm text-red-600 hover:text-red-800 font-medium bg-red-50 hover:bg-red-100 px-3 py-1 rounded-full transition-all duration-300"
            >
              🗑️ Delete Story
            </button>
          )}
          {storyImage && (
          <button
            onClick={() => {
              // Same modal functionality as above
              const modal = document.createElement('div');
              modal.className = 'fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4';
              modal.innerHTML = `
                <div class="relative max-w-4xl max-h-full">
                  <img src="${storyImage}" alt="Story experience" class="max-w-full max-h-full object-contain rounded-lg">
                  <button class="absolute top-4 right-4 text-white text-3xl font-bold bg-black bg-opacity-50 rounded-full w-10 h-10 flex items-center justify-center hover:bg-opacity-75 transition-all duration-300" onclick="document.body.removeChild(this.parentElement.parentElement)">×</button>
                </div>
              `;
              document.body.appendChild(modal);
              modal.addEventListener('click', (e) => {
                if (e.target === modal) {
                  document.body.removeChild(modal);
                }
              });
            }}
            className="text-xs md:text-sm text-blue-600 hover:text-blue-800 font-medium bg-blue-50 hover:bg-blue-100 px-3 py-1 rounded-full transition-all duration-300"
          >
            🔍 View Full Image
          </button>
        )}
      </div>
    </div>
  </div>
  );
};
