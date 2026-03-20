import React, { useRef, useState, useEffect } from 'react';
import './Whiteboard.css';

const Whiteboard = ({ webrtcService }) => {
    const canvasRef = useRef(null);
    const contextRef = useRef(null);
    const containerRef = useRef(null);
    const lastDrawTimeRef = useRef(0);
    const [isDrawing, setIsDrawing] = useState(false);
    const [color, setColor] = useState('#3b82f6'); // Default primary blue
    const [lineWidth, setLineWidth] = useState(3);
    const [isEraser, setIsEraser] = useState(false);

    // Colors matching the design system
    const colors = [
        '#000000', // Black
        '#ffffff', // White
        '#ef4444', // Red (danger)
        '#3b82f6', // Blue (primary)
        '#10b981', // Green (success)
        '#f59e0b', // Yellow (warning)
        '#8b5cf6', // Purple
        '#ec4899', // Pink
    ];

    useEffect(() => {
        // Setup Canvas context
        const canvas = canvasRef.current;

        // Make canvas responsive to its container
        const resizeCanvas = () => {
            const parent = containerRef.current;
            if (parent) {
                // High DPI displays support
                const dpr = window.devicePixelRatio || 1;
                const rect = parent.getBoundingClientRect();

                // Only resize if dimensions actually changed significantly
                if (canvas.width !== Math.round(rect.width * dpr) ||
                    canvas.height !== Math.round(rect.height * dpr)) {

                    // Save canvas data before resizing
                    const tempCanvas = document.createElement('canvas');
                    const tempCtx = tempCanvas.getContext('2d');
                    tempCanvas.width = canvas.width;
                    tempCanvas.height = canvas.height;
                    tempCtx.drawImage(canvas, 0, 0);

                    canvas.width = rect.width * dpr;
                    canvas.height = rect.height * dpr;

                    const context = canvas.getContext('2d');
                    context.scale(dpr, dpr);
                    context.lineCap = 'round';
                    context.lineJoin = 'round';

                    // Set initial background to white
                    context.fillStyle = '#ffffff';
                    context.fillRect(0, 0, canvas.width, canvas.height);

                    // Restore canvas data
                    context.drawImage(tempCanvas, 0, 0, canvas.width / dpr, canvas.height / dpr);

                    contextRef.current = context;
                }
            }
        };

        // Initial setup
        const context = canvas.getContext('2d');
        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.lineCap = 'round';
        context.lineJoin = 'round';
        contextRef.current = context;

        resizeCanvas();
        window.addEventListener('resize', resizeCanvas);

        // Listen to remote whiteboard events via WebRTC DataChannel
        if (webrtcService) {
            webrtcService.onDataMessage = (data) => {
                if (data.type === 'draw') {
                    drawRemoteStroke(data.payload);
                } else if (data.type === 'clear') {
                    clearCanvasLocal();
                }
            };
        }

        return () => {
            window.removeEventListener('resize', resizeCanvas);
            if (webrtcService) webrtcService.onDataMessage = null;
        };
    }, [webrtcService]);

    const getCoordinates = (e) => {
        const canvas = canvasRef.current;
        if (!canvas) return null;

        const rect = canvas.getBoundingClientRect();

        // Handle both mouse and touch events
        if (e.touches && e.touches.length > 0) {
            return {
                x: e.touches[0].clientX - rect.left,
                y: e.touches[0].clientY - rect.top
            };
        } else {
            return {
                x: e.clientX - rect.left,
                y: e.clientY - rect.top
            };
        }
    };

    const startDrawing = (e) => {
        e.preventDefault();
        const coords = getCoordinates(e.nativeEvent);
        if (!coords) return;

        contextRef.current.beginPath();
        contextRef.current.moveTo(coords.x, coords.y);
        setIsDrawing(true);
        lastDrawTimeRef.current = Date.now(); // Reset throttle timer on click

        const currentDrawColor = isEraser ? '#ffffff' : color;
        const currentWidth = isEraser ? lineWidth * 3 : lineWidth;

        // Broadcast the start point
        if (webrtcService && webrtcService.dataChannel && webrtcService.dataChannel.readyState === 'open') {
            const canvas = canvasRef.current;
            const rect = canvas.getBoundingClientRect();

            webrtcService.sendData({
                type: 'draw',
                payload: {
                    x: coords.x / rect.width,
                    y: coords.y / rect.height,
                    color: currentDrawColor,
                    width: currentWidth,
                    isNewStroke: true
                }
            });
        }
    };

    const finishDrawing = () => {
        contextRef.current.closePath();
        setIsDrawing(false);
    };

    const draw = (e) => {
        e.preventDefault();
        if (!isDrawing) return;

        const coords = getCoordinates(e.nativeEvent);
        if (!coords) return;

        // Draw locally
        const currentDrawColor = isEraser ? '#ffffff' : color;
        contextRef.current.strokeStyle = currentDrawColor;
        contextRef.current.lineWidth = isEraser ? lineWidth * 3 : lineWidth;

        contextRef.current.lineTo(coords.x, coords.y);
        contextRef.current.stroke();

        // Broadcast stroke to remote peer with throttle to prevent network flooding
        const now = Date.now();
        if (now - lastDrawTimeRef.current > 40) {
            lastDrawTimeRef.current = now;
            if (webrtcService && webrtcService.dataChannel && webrtcService.dataChannel.readyState === 'open') {
                // Normalize coordinates as percentages so they scale correctly on different sized screens
                const canvas = canvasRef.current;
                const rect = canvas.getBoundingClientRect();

                const payload = {
                    x: coords.x / rect.width,
                    y: coords.y / rect.height,
                    color: currentDrawColor,
                    width: contextRef.current.lineWidth,
                    isNewStroke: false // Tells the remote end whether to moveTo or lineTo
                };

                webrtcService.sendData({
                    type: 'draw',
                    payload
                });
            }
        }
    };



    const drawRemoteStroke = (payload) => {
        if (!contextRef.current || !canvasRef.current) return;

        const canvas = canvasRef.current;
        const rect = canvas.getBoundingClientRect();

        // Denormalize coordinates back to standard pixels for this local screen size
        const localX = payload.x * rect.width;
        const localY = payload.y * rect.height;

        contextRef.current.strokeStyle = payload.color;
        contextRef.current.lineWidth = payload.width;

        if (payload.isNewStroke) {
            contextRef.current.beginPath();
            contextRef.current.moveTo(localX, localY);
        } else {
            contextRef.current.lineTo(localX, localY);
            contextRef.current.stroke();
            contextRef.current.beginPath();
            contextRef.current.moveTo(localX, localY);
        }
    };

    const clearCanvasLocal = () => {
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');
        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, canvas.width, canvas.height);
    };

    const clearCanvas = () => {
        clearCanvasLocal();
        if (webrtcService) {
            webrtcService.sendData({ type: 'clear' });
        }
    };

    const downloadWhiteboard = () => {
        const canvas = canvasRef.current;
        const image = canvas.toDataURL("image/png").replace("image/png", "image/octet-stream");
        const link = document.createElement('a');
        link.download = `whiteboard-${new Date().toISOString().slice(0, 10)}.png`;
        link.href = image;
        link.click();
    };

    return (
        <div className="whiteboard-wrapper">
            <div className="whiteboard-toolbar">
                <div className="toolbar-section">
                    {colors.map((c) => (
                        <button
                            key={c}
                            className={`color-btn ${color === c && !isEraser ? 'active' : ''}`}
                            style={{ backgroundColor: c, border: c === '#ffffff' ? '1px solid #cbd5e1' : 'none' }}
                            onClick={() => {
                                setColor(c);
                                setIsEraser(false);
                            }}
                            title={`Color ${c}`}
                        />
                    ))}
                </div>

                <div className="toolbar-divider"></div>

                <div className="toolbar-section">
                    <input
                        type="range"
                        min="1"
                        max="20"
                        value={lineWidth}
                        onChange={(e) => setLineWidth(parseInt(e.target.value))}
                        className="thickness-slider"
                        title="Stroke Thickness"
                    />
                </div>

                <div className="toolbar-divider"></div>

                <div className="toolbar-section actions-section">
                    <button
                        className={`tool-btn ${isEraser ? 'active' : ''}`}
                        onClick={() => setIsEraser(!isEraser)}
                        title="Eraser"
                    >
                        <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M20 20H7L3 16C2.5 15.5 2.5 14.5 3 14L13 4C13.5 3.5 14.5 3.5 15 4L20 9C20.5 9.5 20.5 10.5 20 11L11 20H20V20Z" />
                        </svg>
                    </button>

                    <button className="tool-btn danger" onClick={clearCanvas} title="Clear Board">
                        <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6"></polyline>
                            <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                        </svg>
                    </button>

                    <button className="tool-btn" onClick={downloadWhiteboard} title="Download Drawing">
                        <svg viewBox="0 0 24 24" width="20" height="20" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                            <polyline points="7 10 12 15 17 10"></polyline>
                            <line x1="12" y1="15" x2="12" y2="3"></line>
                        </svg>
                    </button>
                </div>
            </div>

            <div className="canvas-container" ref={containerRef}>
                <canvas
                    ref={canvasRef}
                    onMouseDown={startDrawing}
                    onMouseUp={finishDrawing}
                    onMouseMove={draw}
                    onMouseOut={finishDrawing}
                    onTouchStart={startDrawing}
                    onTouchEnd={finishDrawing}
                    onTouchMove={draw}
                    className={`whiteboard-canvas ${isEraser ? 'cursor-eraser' : 'cursor-draw'}`}
                />
            </div>
        </div>
    );
};

export default Whiteboard;
