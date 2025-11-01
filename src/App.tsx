import { useState } from "react";
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

function App() {
  const [images, setImages] = useState<ImageFile[]>([]);
  const [selectedImageId, setSelectedImageId] = useState<string | null>(null);

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

  const selectedImage = images.find((img) => img.id === selectedImageId);

  return (
    <div className="app">
      <Sidebar
        images={images}
        selectedImageId={selectedImageId}
        onImagesUpload={handleImagesUpload}
        onImageSelect={handleImageSelect}
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
