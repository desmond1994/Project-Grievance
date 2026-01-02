// src/components/PhotoGallery.jsx
import React from 'react';
import ImageViewer from './ImageViewer';

const API_BASE = 'http://127.0.0.1:8000';

const toUrl = (path) => {
  if (!path) return null;
  return path.startsWith('http') ? path : `${API_BASE}${path}`;
};

export default function PhotoGallery({ photos }) {
  const [selectedIndex, setSelectedIndex] = React.useState(0);

  if (!photos || photos.length === 0) {
    return <p>No photos uploaded.</p>;
  }

  const selectedPhoto = photos[selectedIndex];
  const getPath = (p) =>
  typeof p === 'string'
    ? p
    : (p?.image || p?.url || p?.file || p?.image_url || p?.src || p?.path);

const mainUrl = toUrl(getPath(selectedPhoto));


  console.log("PhotoGallery photos[0]:", photos?.[0]);
  console.log("PhotoGallery selectedPhoto.image:", selectedPhoto?.image);
console.log("photos length:", photos?.length);
console.log("sample photo:", photos?.[0]);
console.log("mainUrl:", mainUrl);

  return (
    <div className="photo-gallery">
      {mainUrl ? (
        <ImageViewer image={mainUrl} width={400} height={300} />
      ) : (
        <p>Image URL missing.</p>
      )}

      <div className="photo-gallery-thumbnails">
        {photos.map((photo, index) => {
          const thumbUrl = toUrl(getPath(photo));
if (!thumbUrl) return null;

return (
  <img
    key={index}
    src={thumbUrl}
    alt={`Item ${index + 1} thumbnail`}
    className={
      'photo-gallery-thumbnail' + (index === selectedIndex ? ' selected' : '')
    }
    onClick={() => setSelectedIndex(index)}
  />
);

        })}
      </div>
    </div>
  );
}
