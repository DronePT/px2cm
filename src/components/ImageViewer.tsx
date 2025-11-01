import { useEffect, useRef, useState } from "react";
import "./ImageViewer.css";

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

interface ImageViewerProps {
  selectedImage: ImageFile | null;
  onScaleUpdate: (
    imageId: string,
    scale: number,
    calibrationLine?: Line,
  ) => void;
  onMeasurementsUpdate: (imageId: string, measurements: Line[]) => void;
}

// Helper function to calculate distance between two points
const calculateDistance = (p1: Point, p2: Point): number => {
  return Math.sqrt(Math.pow(p2.x - p1.x, 2) + Math.pow(p2.y - p1.y, 2));
};

// Helper function to calculate distance from a point to a line segment
const distanceToLineSegment = (
  point: Point,
  lineStart: Point,
  lineEnd: Point,
): number => {
  const A = point.x - lineStart.x;
  const B = point.y - lineStart.y;
  const C = lineEnd.x - lineStart.x;
  const D = lineEnd.y - lineStart.y;

  const dot = A * C + B * D;
  const lenSq = C * C + D * D;
  let param = -1;

  if (lenSq !== 0) param = dot / lenSq;

  let xx, yy;

  if (param < 0) {
    xx = lineStart.x;
    yy = lineStart.y;
  } else if (param > 1) {
    xx = lineEnd.x;
    yy = lineEnd.y;
  } else {
    xx = lineStart.x + param * C;
    yy = lineStart.y + param * D;
  }

  const dx = point.x - xx;
  const dy = point.y - yy;
  return Math.sqrt(dx * dx + dy * dy);
};

// Helper function to snap point to nearest 45-degree angle
const snapToAngle = (start: Point, end: Point): Point => {
  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const distance = Math.sqrt(dx * dx + dy * dy);

  // Calculate angle in radians
  const angle = Math.atan2(dy, dx);

  // Convert to degrees and snap to nearest 45°
  const degrees = angle * (180 / Math.PI);
  const snappedDegrees = Math.round(degrees / 45) * 45;

  // Convert back to radians
  const snappedRadians = snappedDegrees * (Math.PI / 180);

  // Calculate new end point
  return {
    x: start.x + distance * Math.cos(snappedRadians),
    y: start.y + distance * Math.sin(snappedRadians),
  };
};

function ImageViewer({
  selectedImage,
  onScaleUpdate,
  onMeasurementsUpdate,
}: ImageViewerProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const zoomCanvasRef = useRef<HTMLCanvasElement>(null);

  const [isDrawing, setIsDrawing] = useState(false);
  const [startPoint, setStartPoint] = useState<Point | null>(null);
  const [endPoint, setEndPoint] = useState<Point | null>(null);
  const [isShiftPressed, setIsShiftPressed] = useState(false);
  const [isCalibrationMode, setIsCalibrationMode] = useState(false);
  const [showCalibrationInput, setShowCalibrationInput] = useState(false);
  const [tempCalibrationDistance, setTempCalibrationDistance] = useState("");
  const [hoveredLineIndex, setHoveredLineIndex] = useState<number | null>(null);
  const [mousePosition, setMousePosition] = useState<Point | null>(null);

  // Get scale, calibration line, and measurements from the selected image, or use defaults
  const scale = selectedImage?.scale || 96;
  const calibrationLine = selectedImage?.calibrationLine || null;
  const measurementLines = selectedImage?.measurementLines || [];

  // Shift key detection
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Shift") {
        setIsShiftPressed(true);
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.key === "Shift") {
        setIsShiftPressed(false);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    window.addEventListener("keyup", handleKeyUp);

    return () => {
      window.removeEventListener("keydown", handleKeyDown);
      window.removeEventListener("keyup", handleKeyUp);
    };
  }, []);

  // Reset drawing state when image changes
  useEffect(() => {
    setStartPoint(null);
    setEndPoint(null);
    setIsDrawing(false);
    setIsCalibrationMode(false);
  }, [selectedImage?.id]);

  // Draw the measurement line on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    const image = imageRef.current;
    if (!canvas || !image || !selectedImage) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Helper function to draw perpendicular endpoint markers
    const drawEndpointMarker = (
      point: Point,
      angle: number,
      color: string,
      lineWidth: number = 3,
    ) => {
      const markerLength = 16; // Increased from 10
      const perpAngle = angle + Math.PI / 2;

      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
      ctx.beginPath();
      ctx.moveTo(
        point.x - (markerLength / 2) * Math.cos(perpAngle),
        point.y - (markerLength / 2) * Math.sin(perpAngle),
      );
      ctx.lineTo(
        point.x + (markerLength / 2) * Math.cos(perpAngle),
        point.y + (markerLength / 2) * Math.sin(perpAngle),
      );
      ctx.stroke();
    };

    // Helper function to draw text label in the middle of a line
    const drawLineLabel = (line: Line, color: string) => {
      const distance = calculateDistance(line.start, line.end);
      const cmDistance = distance / scale;

      // Calculate midpoint
      const midX = (line.start.x + line.end.x) / 2;
      const midY = (line.start.y + line.end.y) / 2;

      // Format text
      const text = `${cmDistance.toFixed(2)} cm`;

      // Set text style - increased font size
      ctx.font = "bold 24px system-ui, Arial, sans-serif"; // Increased to 24px
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";

      // Draw background rectangle for better readability
      const metrics = ctx.measureText(text);
      const padding = 8; // Increased for larger text
      const bgWidth = metrics.width + padding * 2;
      const bgHeight = 34; // Increased for larger text

      ctx.fillStyle = "rgba(0, 0, 0, 0.7)";
      ctx.fillRect(midX - bgWidth / 2, midY - bgHeight / 2, bgWidth, bgHeight);

      // Draw text
      ctx.fillStyle = color;
      ctx.fillText(text, midX, midY);
    };

    // Draw calibration line first (if exists) in blue
    if (calibrationLine) {
      ctx.strokeStyle = "#4444ff";
      ctx.lineWidth = 4; // Increased to 4px
      ctx.lineCap = "round";

      // Calculate angle for perpendicular markers
      const angle = Math.atan2(
        calibrationLine.end.y - calibrationLine.start.y,
        calibrationLine.end.x - calibrationLine.start.x,
      );

      // Draw line
      ctx.beginPath();
      ctx.moveTo(calibrationLine.start.x, calibrationLine.start.y);
      ctx.lineTo(calibrationLine.end.x, calibrationLine.end.y);
      ctx.stroke();

      // Draw start point marker
      drawEndpointMarker(calibrationLine.start, angle, "#4444ff", 4);

      // Draw end point marker
      drawEndpointMarker(calibrationLine.end, angle, "#4444ff", 4);
    }

    // Draw all saved measurement lines with labels
    measurementLines.forEach((line, index) => {
      const isHovered = hoveredLineIndex === index;
      const color = isHovered ? "#ff8888" : "#ff4444";
      const lineWidth = isHovered ? 5 : 4; // Increased to 4px (5px when hovered)

      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
      ctx.lineCap = "round";

      // Calculate angle for perpendicular markers
      const angle = Math.atan2(
        line.end.y - line.start.y,
        line.end.x - line.start.x,
      );

      // Draw line
      ctx.beginPath();
      ctx.moveTo(line.start.x, line.start.y);
      ctx.lineTo(line.end.x, line.end.y);
      ctx.stroke();

      // Draw start point marker
      drawEndpointMarker(line.start, angle, color, lineWidth);

      // Draw end point marker
      drawEndpointMarker(line.end, angle, color, lineWidth);

      // Draw label with distance
      drawLineLabel(line, isHovered ? "#ffff00" : "#ffffff");
    });

    // Draw current measurement line being drawn (if exists)
    if (startPoint && endPoint) {
      const color = isCalibrationMode ? "#4444ff" : "#ff4444";
      const lineWidth = 4; // Increased to 4px
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
      ctx.lineCap = "round";

      // Calculate angle for perpendicular markers
      const angle = Math.atan2(
        endPoint.y - startPoint.y,
        endPoint.x - startPoint.x,
      );

      // Draw line
      ctx.beginPath();
      ctx.moveTo(startPoint.x, startPoint.y);
      ctx.lineTo(endPoint.x, endPoint.y);
      ctx.stroke();

      // Draw start point marker
      drawEndpointMarker(startPoint, angle, color, lineWidth);

      // Draw end point marker
      drawEndpointMarker(endPoint, angle, color, lineWidth);

      // Draw label for current line if not in calibration mode
      if (!isCalibrationMode) {
        drawLineLabel({ start: startPoint, end: endPoint }, "#ffffff");
      }
    }
  }, [
    startPoint,
    endPoint,
    selectedImage,
    scale,
    calibrationLine,
    measurementLines,
    isCalibrationMode,
    hoveredLineIndex,
  ]);

  // Render zoom window
  useEffect(() => {
    const zoomCanvas = zoomCanvasRef.current;
    const mainCanvas = canvasRef.current;
    const image = imageRef.current;

    if (!zoomCanvas || !mainCanvas || !image || !mousePosition) return;

    const zoomCtx = zoomCanvas.getContext("2d");
    const mainCtx = mainCanvas.getContext("2d");
    if (!zoomCtx || !mainCtx) return;

    // Zoom settings
    const zoomFactor = 3;
    const zoomSize = 150; // Size of zoom window
    const sourceSize = zoomSize / zoomFactor; // Size of area to copy from source

    // Clear zoom canvas
    zoomCtx.clearRect(0, 0, zoomCanvas.width, zoomCanvas.height);

    // Calculate source coordinates (centered on mouse)
    const sourceX = Math.max(
      0,
      Math.min(mousePosition.x - sourceSize / 2, mainCanvas.width - sourceSize),
    );
    const sourceY = Math.max(
      0,
      Math.min(
        mousePosition.y - sourceSize / 2,
        mainCanvas.height - sourceSize,
      ),
    );

    // Create an offscreen canvas to combine image + measurements
    const offscreenCanvas = document.createElement("canvas");
    offscreenCanvas.width = mainCanvas.width;
    offscreenCanvas.height = mainCanvas.height;
    const offscreenCtx = offscreenCanvas.getContext("2d");

    if (!offscreenCtx) return;

    // Draw only the image (without measurements for clearer zoom view)
    offscreenCtx.drawImage(image, 0, 0, mainCanvas.width, mainCanvas.height);

    // Now draw the zoomed portion from the composite
    zoomCtx.drawImage(
      offscreenCanvas,
      sourceX,
      sourceY,
      sourceSize,
      sourceSize,
      0,
      0,
      zoomSize,
      zoomSize,
    );

    // Draw crosshair in the center
    zoomCtx.strokeStyle = "#00ff00";
    zoomCtx.lineWidth = 1;
    const center = zoomSize / 2;

    // Horizontal line
    zoomCtx.beginPath();
    zoomCtx.moveTo(0, center);
    zoomCtx.lineTo(zoomSize, center);
    zoomCtx.stroke();

    // Vertical line
    zoomCtx.beginPath();
    zoomCtx.moveTo(center, 0);
    zoomCtx.lineTo(center, zoomSize);
    zoomCtx.stroke();

    // Draw center dot
    zoomCtx.fillStyle = "#00ff00";
    zoomCtx.beginPath();
    zoomCtx.arc(center, center, 2, 0, Math.PI * 2);
    zoomCtx.fill();
  }, [mousePosition, startPoint, endPoint, measurementLines, calibrationLine]);

  // Handle image load to set canvas size
  const handleImageLoad = () => {
    const canvas = canvasRef.current;
    const image = imageRef.current;
    if (!canvas || !image) return;

    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
  };

  const getCanvasCoordinates = (
    event: React.MouseEvent<HTMLCanvasElement>,
  ): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    return {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY,
    };
  };

  const handleMouseDown = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const point = getCanvasCoordinates(event);
    setMousePosition(point);

    // Check if clicking near an existing line (to delete it)
    const clickThreshold = 10; // pixels
    const clickedLineIndex = measurementLines.findIndex(
      (line) =>
        distanceToLineSegment(point, line.start, line.end) < clickThreshold,
    );

    if (clickedLineIndex !== -1 && !isCalibrationMode && selectedImage) {
      // Delete the clicked line
      const updatedLines = measurementLines.filter(
        (_, index) => index !== clickedLineIndex,
      );
      onMeasurementsUpdate(selectedImage.id, updatedLines);
      setHoveredLineIndex(null);
      return;
    }

    // Start drawing a new line
    setStartPoint(point);
    setEndPoint(point);
    setIsDrawing(true);
  };

  const handleMouseMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const point = getCanvasCoordinates(event);
    setMousePosition(point);

    if (isDrawing && startPoint) {
      // Drawing mode - update end point
      let adjustedPoint = point;

      // Apply shift constraint if shift is pressed
      if (isShiftPressed) {
        adjustedPoint = snapToAngle(startPoint, adjustedPoint);
      }

      setEndPoint(adjustedPoint);
    } else if (!isCalibrationMode) {
      // Not drawing - check for hover over existing lines
      const hoverThreshold = 10; // pixels
      const hoveredIndex = measurementLines.findIndex(
        (line) =>
          distanceToLineSegment(point, line.start, line.end) < hoverThreshold,
      );

      setHoveredLineIndex(hoveredIndex !== -1 ? hoveredIndex : null);
    }
  };

  const handleMouseUp = () => {
    if (isDrawing && startPoint && endPoint && selectedImage) {
      if (isCalibrationMode) {
        // Show input dialog to get known distance for calibration
        setShowCalibrationInput(true);
      } else {
        // Add new measurement line to the list
        const newLine: Line = { start: startPoint, end: endPoint };
        const updatedLines = [...measurementLines, newLine];
        onMeasurementsUpdate(selectedImage.id, updatedLines);

        // Clear current drawing
        setStartPoint(null);
        setEndPoint(null);
      }
    }
    setIsDrawing(false);
  };

  const handleScaleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseFloat(event.target.value);
    if (value > 0 && selectedImage) {
      // Update the scale for this specific image
      onScaleUpdate(selectedImage.id, value, calibrationLine || undefined);
    }
  };

  const toggleCalibrationMode = () => {
    setIsCalibrationMode(!isCalibrationMode);
    // Clear current measurement when toggling
    setStartPoint(null);
    setEndPoint(null);
  };

  const handleCalibrationSubmit = () => {
    const knownDistance = parseFloat(tempCalibrationDistance);
    if (knownDistance > 0 && startPoint && endPoint && selectedImage) {
      const pixelDistance = calculateDistance(startPoint, endPoint);
      const newScale = pixelDistance / knownDistance;
      const newCalibrationLine = { start: startPoint, end: endPoint };

      // Save scale and calibration line to this specific image
      onScaleUpdate(selectedImage.id, newScale, newCalibrationLine);

      setShowCalibrationInput(false);
      setTempCalibrationDistance("");
      setIsCalibrationMode(false);
      // Clear measurement points but keep calibration line (now stored in image)
      setStartPoint(null);
      setEndPoint(null);
    }
  };

  const handleCalibrationCancel = () => {
    setShowCalibrationInput(false);
    setTempCalibrationDistance("");
    setStartPoint(null);
    setEndPoint(null);
  };

  if (!selectedImage) {
    return (
      <div className="image-viewer empty">
        <div className="empty-message">
          <p>No image selected</p>
          <p>Upload and select an image from the sidebar to get started</p>
        </div>
      </div>
    );
  }

  return (
    <div className="image-viewer">
      <div className="controls">
        <button
          onClick={toggleCalibrationMode}
          className={`calibration-button ${isCalibrationMode ? "active" : ""}`}
        >
          {isCalibrationMode ? "Cancel Calibration" : "Set Scale"}
        </button>
        <div className="control-group">
          <label htmlFor="scale-input">Scale (pixels per cm):</label>
          <input
            id="scale-input"
            type="number"
            value={scale}
            onChange={handleScaleChange}
            min="1"
            step="0.1"
            disabled={isCalibrationMode}
          />
        </div>
        <div className="instruction">
          {isCalibrationMode
            ? "Draw a line of known length, then enter its measurement"
            : "Click and drag to measure • Click on a line to delete it"}
          {isShiftPressed && " • Shift: Straight lines"}
        </div>
      </div>

      {/* Calibration input modal */}
      {showCalibrationInput && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Set Scale</h3>
            <p>What is the length of this line in centimeters?</p>
            <input
              type="number"
              value={tempCalibrationDistance}
              onChange={(e) => setTempCalibrationDistance(e.target.value)}
              placeholder="Enter distance in cm"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === "Enter") handleCalibrationSubmit();
                if (e.key === "Escape") handleCalibrationCancel();
              }}
            />
            <div className="modal-buttons">
              <button
                onClick={handleCalibrationSubmit}
                className="submit-button"
              >
                Set Scale
              </button>
              <button
                onClick={handleCalibrationCancel}
                className="cancel-button"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
      <div className="canvas-container" ref={containerRef}>
        <img
          ref={imageRef}
          src={selectedImage.dataUrl}
          alt="Measurement target"
          onLoad={handleImageLoad}
          className="measurement-image"
        />
        <canvas
          ref={canvasRef}
          className="measurement-canvas"
          style={{
            cursor: hoveredLineIndex !== null ? "pointer" : "crosshair",
          }}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={() => {
            handleMouseUp();
            setMousePosition(null);
          }}
        />
        {/* Zoom window */}
        {mousePosition && (
          <canvas
            ref={zoomCanvasRef}
            className="zoom-window"
            width={150}
            height={150}
          />
        )}
      </div>
    </div>
  );
}

export default ImageViewer;
