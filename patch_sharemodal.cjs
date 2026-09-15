const fs = require('fs');
let code = fs.readFileSync('src/components/ui/ShareModal.tsx', 'utf8');

code = code.replace(
  "import html2canvas from 'html2canvas';",
  "import { toPng, toBlob } from 'html-to-image';"
);

code = code.replace(
  `      const canvas = await html2canvas(cardRef.current, {
        scale: 3, // High resolution for better sharing
        backgroundColor: '#0a0c10',
        useCORS: true,
      });
      
      const image = canvas.toDataURL('image/png');`,
  `      const image = await toPng(cardRef.current, {
        pixelRatio: 3,
        backgroundColor: '#0a0c10',
      });`
);

code = code.replace(
  `      const canvas = await html2canvas(cardRef.current, {
        scale: 3,
        backgroundColor: '#0a0c10',
        useCORS: true,
      });
      
      canvas.toBlob(async (blob) => {
        if (!blob) {
          setToastMessage({ title: 'Failed to generate image', type: 'error' });
          setIsExporting(false);
          return;
        }`,
  `      const blob = await toBlob(cardRef.current, {
        pixelRatio: 3,
        backgroundColor: '#0a0c10',
      });
      
      if (!blob) {
        setToastMessage({ title: 'Failed to generate image', type: 'error' });
        setIsExporting(false);
        return;
      }`
);

code = code.replace(
  `        }
        setIsExporting(false);
      }, 'image/png');`,
  `        }
        setIsExporting(false);`
);

fs.writeFileSync('src/components/ui/ShareModal.tsx', code);
