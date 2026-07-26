/**
 * High-performance, client-side utility to export Recharts SVG visualizations to PNG/SVG files.
 * Uses canvas with high-dpi (2x scale) rendering and solid background fills to ensure crisp typography and layout.
 */
export const downloadChartAsPng = (elementId: string, filename: string) => {
  const element = document.getElementById(elementId);
  if (!element) {
    console.error(`Element with ID ${elementId} not found`);
    return;
  }

  // Find the SVG inside the element
  const svg = element.querySelector('svg');
  if (!svg) {
    console.error(`SVG element inside ${elementId} not found`);
    return;
  }

  try {
    // 1. Serialize the SVG to string
    const serializer = new XMLSerializer();
    let svgString = serializer.serializeToString(svg);
    
    // Ensure XML namespace is present
    if (!svgString.match(/^<svg[^>]+xmlns="http:\/\/www\.w3\.org\/2000\/svg"/)) {
      svgString = svgString.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
    }

    // 2. Create an image and load the SVG source via a Blob URL
    const img = new Image();
    const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const blobURL = window.URL.createObjectURL(svgBlob);

    img.onload = () => {
      // 3. Create a canvas with 2x resolution scale for high-DPI output
      const canvas = document.createElement('canvas');
      const bbox = svg.getBoundingClientRect();
      const width = bbox.width || 800;
      const height = bbox.height || 400;
      const scale = 2; 

      canvas.width = width * scale;
      canvas.height = height * scale;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        // Fill white background (crucial to prevent transparent dark charts)
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Render the SVG image onto the canvas
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        // 4. Trigger the standard browser file download
        const pngURL = canvas.toDataURL('image/png');
        const downloadLink = document.createElement('a');
        downloadLink.href = pngURL;
        downloadLink.download = filename.endsWith('.png') ? filename : `${filename}.png`;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
      }
      
      // Revoke the object URL to free memory
      window.URL.revokeObjectURL(blobURL);
    };

    img.onerror = (e) => {
      console.error('Error loading SVG into canvas image, falling back to SVG file download', e);
      // Fallback: download as SVG if canvas conversion is sandboxed
      const downloadLink = document.createElement('a');
      downloadLink.href = blobURL;
      downloadLink.download = filename.endsWith('.png') ? filename.replace('.png', '.svg') : `${filename}.svg`;
      document.body.appendChild(downloadLink);
      downloadLink.click();
      document.body.removeChild(downloadLink);
    };

    img.src = blobURL;
  } catch (error) {
    console.error('Failed to download chart as PNG', error);
  }
};
