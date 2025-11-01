import { useState, useEffect } from "react";
import Sidebar from "./components/Sidebar";
import ImageViewer from "./components/ImageViewer";
import "./App.css";

interface Point {
  x: number;
  y: number;
}

interface Line {
  start: Point;
  end: Point;
}

interface ImageFile {
  id: string;
  dataUrl: string;
  name: string;
  scale?: number;
  calibrationLine?: Line;
  measurementLines?: Line[];
}

const STORAGE_KEY_IMAGES = "px2cm-images";
const STORAGE_KEY_SELECTED_ID = "px2cm-selected-id";

function App() {
  const [images, setImages] = useState<ImageFile[]>([]);
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);

  // Load saved data from localStorage on mount
  useEffect(() => {
    try {
      const savedImages = localStorage.getItem(STORAGE_KEY_IMAGES);
      const savedSelectedId = localStorage.getItem(STORAGE_KEY_SELECTED_ID);

      if (savedImages) {
        const parsedImages = JSON.parse(savedImages);
        setImages(parsedImages);
      }

      if (savedSelectedId) {
        setSelectedImageId(savedSelectedId);
      }
    } catch (error) {
      console.error("Failed to load saved data from localStorage:", error);
      // If there's an error, clear corrupted data
      localStorage.removeItem(STORAGE_KEY_IMAGES);
      localStorage.removeItem(STORAGE_KEY_SELECTED_ID);
    }
  }, []);

  // Save images to localStorage whenever they change
  useEffect(() => {
    try {
      if (images.length > 0) {
        localStorage.setItem(STORAGE_KEY_IMAGES, JSON.stringify(images));
      } else {
        // Clear storage if no images
        localStorage.removeItem(STORAGE_KEY_IMAGES);
      }
    } catch (error) {
      console.error("Failed to save images to localStorage:", error);
      // If quota exceeded, alert the user
      if (
        error instanceof DOMException &&
        error.name === "QuotaExceededError"
      ) {
        alert(
          "Storage quota exceeded. Your images are too large to save automatically. Consider using fewer or smaller images.",
        );
      }
    }
  }, [images]);

  // Save selected image ID to localStorage whenever it changes
  useEffect(() => {
    try {
      if (selectedImageId) {
        localStorage.setItem(STORAGE_KEY_SELECTED_ID, selectedImageId);
      } else {
        localStorage.removeItem(STORAGE_KEY_SELECTED_ID);
      }
    } catch (error) {
      console.error("Failed to save selected ID to localStorage:", error);
    }
  }, [selectedImageId]);

  const handleImagesUpload = (files: File[]) => {
    const newImages: ImageFile[] = [];

    files.forEach((file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const dataUrl = e.target?.result as string;
        const newImage: ImageFile = {
          id: `${Date.now()}-${Math.random()}`,
          dataUrl,
          name: file.name,
        };
        newImages.push(newImage);

        // Update state when all files are loaded
        if (newImages.length === files.length) {
          setImages((prev) => [...prev, ...newImages]);
          // Auto-select the first uploaded image if none is selected
          if (!selectedImageId && newImages.length > 0) {
            setSelectedImageId(newImages[0].id);
          }
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleImageSelect = (id: string) => {
    setSelectedImageId(id);
  };

  const updateImageScale = (
    imageId: string,
    scale: number,
    calibrationLine?: Line,
  ) => {
    setImages((prev) =>
      prev.map((img) =>
        img.id === imageId ? { ...img, scale, calibrationLine } : img,
      ),
    );
  };

  const updateImageMeasurements = (imageId: string, measurements: Line[]) => {
    setImages((prev) =>
      prev.map((img) =>
        img.id === imageId ? { ...img, measurementLines: measurements } : img,
      ),
    );
  };

  const handleClearAll = () => {
    if (
      confirm(
        "Are you sure you want to clear all images and measurements? This cannot be undone.",
      )
    ) {
      setImages([]);
      setSelectedImageId(null);
      localStorage.removeItem(STORAGE_KEY_IMAGES);
      localStorage.removeItem(STORAGE_KEY_SELECTED_ID);
    }
  };

  const handleDeleteImage = (imageId: string) => {
    // Remove the image from the list
    setImages((prev) => prev.filter((img) => img.id !== imageId));

    // If the deleted image was selected, clear selection or select another image
    if (selectedImageId === imageId) {
      const remainingImages = images.filter((img) => img.id !== imageId);
      if (remainingImages.length > 0) {
        // Select the first remaining image
        setSelectedImageId(remainingImages[0].id);
      } else {
        // No images left
        setSelectedImageId(null);
      }
    }
  };

  const selectedImage = images.find((img) => img.id === selectedImageId);

  return (
    <div className="app">
      <Sidebar
        images={images}
        selectedImageId={selectedImageId}
        onImagesUpload={handleImagesUpload}
        onImageSelect={handleImageSelect}
        onClearAll={handleClearAll}
        onDeleteImage={handleDeleteImage}
      />
      <ImageViewer
        selectedImage={selectedImage || null}
        onScaleUpdate={updateImageScale}
        onMeasurementsUpdate={updateImageMeasurements}
      />
    </div>
  );
}

export default App;
