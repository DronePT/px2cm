import { useRef } from "react";
import "./Sidebar.css";

interface ImageFile {
  id: string;
  dataUrl: string;
  name: string;
}

interface SidebarProps {
  images: ImageFile[];
  selectedImageId: string | null;
  onImagesUpload: (files: File[]) => void;
  onImageSelect: (id: string) => void;
  onClearAll: () => void;
  onDeleteImage: (imageId: string) => void;
}

function Sidebar({
  images,
  selectedImageId,
  onImagesUpload,
  onImageSelect,
  onClearAll,
  onDeleteImage,
}: SidebarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (files && files.length > 0) {
      onImagesUpload(Array.from(files));
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleDeleteClick = (
    event: React.MouseEvent,
    imageId: string,
    imageName: string,
  ) => {
    event.stopPropagation(); // Prevent selecting the image when clicking delete
    if (confirm(`Are you sure you want to delete "${imageName}"?`)) {
      onDeleteImage(imageId);
    }
  };

  return (
    <div className="sidebar">
      <div className="sidebar-header">
        <h2>Images</h2>
        <button onClick={handleUploadClick} className="upload-button">
          Upload Images
        </button>
        {images.length > 0 && (
          <button onClick={onClearAll} className="clear-button">
            Clear All
          </button>
        )}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={handleFileChange}
          style={{ display: "none" }}
        />
      </div>
      <div className="thumbnail-list">
        {images.length === 0 ? (
          <div className="empty-state">
            <p>No images uploaded yet</p>
            <p>Click "Upload Images" to get started</p>
          </div>
        ) : (
          images.map((image) => (
            <div
              key={image.id}
              className={`thumbnail ${selectedImageId === image.id ? "selected" : ""}`}
              onClick={() => onImageSelect(image.id)}
            >
              <button
                className="delete-image-button"
                onClick={(e) => handleDeleteClick(e, image.id, image.name)}
                title="Delete image"
              >
                ×
              </button>
              <img src={image.dataUrl} alt={image.name} />
              <div className="thumbnail-name">{image.name}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default Sidebar;
