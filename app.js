// --- Global Application State ---
let cropper = null;
let currentSourceDataUrl = null;
let selectedShape = 'square'; // 'square' | 'portrait' | 'landscape' | 'circle'
let selectedHooks = 1;        // 1 | 2
let isCropLocked = false;      // Crop / Zoom Lock State

// Physical Target Dimensions (mm) & Aspect Ratios
const SHAPE_CONFIG = {
  square: { 
    name: 'Square 3x3',
    widthMM: 76.2, 
    heightMM: 76.2, 
    ratio: 1,
    targetPixels: { w: 900, h: 900 }
  },
  portrait: { 
    name: 'Portrait 3x4',
    widthMM: 76.2, 
    heightMM: 101.6, 
    ratio: 3 / 4,
    targetPixels: { w: 900, h: 1200 }
  },
  landscape: { 
    name: 'Landscape 4x3',
    widthMM: 101.6, 
    heightMM: 76.2, 
    ratio: 4 / 3,
    targetPixels: { w: 1200, h: 900 }
  },
  circle: { 
    name: 'Circle 3in',
    widthMM: 76.2, 
    heightMM: 76.2, 
    ratio: 1,
    targetPixels: { w: 900, h: 900 }
  }
};

document.addEventListener('DOMContentLoaded', () => {
  // DOM Elements
  const uploadZone = document.getElementById('uploadZone');
  const imageInput = document.getElementById('imageInput');
  const cameraInput = document.getElementById('cameraInput');
  const btnCamera = document.getElementById('btnCamera');
  const cropperImage = document.getElementById('cropperImage');
  const cropperWrapper = document.getElementById('cropperWrapper');
  const borderGuide = document.getElementById('borderGuide');
  const resWarning = document.getElementById('resWarning');
  const statusBadge = document.getElementById('statusBadge');
  const exportSuccess = document.getElementById('exportSuccess');

  // Lock Elements
  const btnLockCrop = document.getElementById('btnLockCrop');
  const lockIcon = document.getElementById('lockIcon');
  const lockText = document.getElementById('lockText');

  // Sliders & Controls
  const contrastSlider = document.getElementById('contrastSlider');
  const brightnessSlider = document.getElementById('brightnessSlider');
  const contrastVal = document.getElementById('contrastVal');
  const brightnessVal = document.getElementById('brightnessVal');
  const btnResetAdjust = document.getElementById('btnResetAdjust');

  // Hook elements
  const hookOpt1 = document.getElementById('hookOpt1');
  const hookOpt2 = document.getElementById('hookOpt2');

  // --- Upload Event Handlers ---
  if (uploadZone && imageInput) {
    uploadZone.addEventListener('click', () => {
      imageInput.value = '';
      imageInput.click();
    });

    uploadZone.addEventListener('dragover', (e) => {
      e.preventDefault();
      uploadZone.style.borderColor = '#38bdf8';
      uploadZone.style.background = 'rgba(56, 189, 248, 0.08)';
    });

    uploadZone.addEventListener('dragleave', (e) => {
      e.preventDefault();
      uploadZone.style.borderColor = '#64748b';
      uploadZone.style.background = 'transparent';
    });

    uploadZone.addEventListener('drop', (e) => {
      e.preventDefault();
      uploadZone.style.borderColor = '#64748b';
      uploadZone.style.background = 'transparent';
      if (e.dataTransfer && e.dataTransfer.files.length > 0) {
        handleImageUpload(e.dataTransfer.files[0]);
      }
    });

    imageInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files.length > 0) {
        handleImageUpload(e.target.files[0]);
      }
    });
  }

  // Camera Button Handler
  if (btnCamera && cameraInput) {
    btnCamera.addEventListener('click', () => {
      cameraInput.value = '';
      cameraInput.click();
    });

    cameraInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files.length > 0) {
        handleImageUpload(e.target.files[0]);
      }
    });
  }

  // Handle Image File Loading and Auto Grayscale Conversion
  function handleImageUpload(file) {
    if (!file.type.startsWith('image/')) {
      alert('Please upload a valid image file (JPG, PNG, WEBP).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const rawImg = new Image();
      rawImg.onload = () => {
        const grayDataUrl = convertToGrayscaleDataUrl(rawImg);
        currentSourceDataUrl = grayDataUrl;

        if (isCropLocked) {
          setLockState(false);
        }

        initOrUpdateCropper(grayDataUrl);

        document.getElementById('uploadText').innerHTML = `
          <strong>${file.name}</strong><br>
          <span style="color:#38bdf8;">✓ Loaded in Grayscale</span>
        `;
        statusBadge.textContent = 'Cropping Active';
        statusBadge.style.color = '#38bdf8';
      };
      rawImg.src = event.target.result;
    };
    reader.readAsDataURL(file);
  }

  // --- Robust Lock / Unlock Implementation ---
  if (btnLockCrop) {
    btnLockCrop.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      if (!cropper) return;
      setLockState(!isCropLocked);
    });
  }

  function setLockState(locked) {
    isCropLocked = locked;

    if (isCropLocked) {
      if (cropper) {
        cropper.disable();
      }
      btnLockCrop.classList.add('locked');
      lockIcon.textContent = '🔒';
      lockText.textContent = 'Locked';
      statusBadge.textContent = 'Position Locked';
      statusBadge.style.color = '#10b981';
    } else {
      if (cropper) {
        cropper.enable();
      }
      btnLockCrop.classList.remove('locked');
      lockIcon.textContent = '🔓';
      lockText.textContent = 'Unlocked';
      statusBadge.textContent = 'Cropping Active';
      statusBadge.style.color = '#38bdf8';
    }
  }

  // --- Shape Picker Handlers ---
  const shapeButtons = document.querySelectorAll('#shapeSelector .opt-btn');
  shapeButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      shapeButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      selectedShape = btn.dataset.shape;
      applyShapeToCropper(selectedShape);
      handleShapeHookConstraints(selectedShape);
      updateBorderOverlayGuide();
    });
  });

  function handleShapeHookConstraints(shape) {
    if (shape === 'circle') {
      hookOpt2.disabled = true;
      hookOpt2.style.display = 'none';

      selectedHooks = 1;
      hookOpt1.classList.add('active');
      hookOpt2.classList.remove('active');
    } else {
      hookOpt2.disabled = false;
      hookOpt2.style.display = 'flex';
    }
  }

  // --- Integrated Hook Selection Handlers ---
  const hookButtons = document.querySelectorAll('#hookSelector .opt-btn');
  hookButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.disabled) return;
      hookButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      selectedHooks = parseInt(btn.dataset.hooks, 10);
      updateBorderOverlayGuide();
    });
  });

  // --- Cropper.js Initialization & Configuration ---
  function initOrUpdateCropper(imageSrc) {
    if (cropper) {
      cropper.destroy();
      cropper = null;
    }

    cropperImage.src = imageSrc;
    applyShapeToCropper(selectedShape);

    cropper = new Cropper(cropperImage, {
      aspectRatio: SHAPE_CONFIG[selectedShape].ratio,
      viewMode: 1,
      dragMode: 'move',
      autoCropArea: 0.95,
      restore: false,
      guides: true,
      center: true,
      highlight: false,
      cropBoxMovable: true,
      cropBoxResizable: true,
      toggleDragModeOnDblclick: false,
      ready() {
        updateBorderOverlayGuide();
        checkDPIResolution();
        updateToneFilters();
        if (isCropLocked) cropper.disable();
      },
      crop() {
        updateBorderOverlayGuide();
        checkDPIResolution();
      }
    });
  }

  function applyShapeToCropper(shape) {
    if (shape === 'circle') {
      cropperWrapper.classList.add('is-circle');
      if (borderGuide) borderGuide.classList.add('is-circle');
    } else {
      cropperWrapper.classList.remove('is-circle');
      if (borderGuide) borderGuide.classList.remove('is-circle');
    }

    if (cropper) {
      cropper.setAspectRatio(SHAPE_CONFIG[shape].ratio);
    }
  }

  // --- Border & Hook Guide Positioning ---
  function updateBorderOverlayGuide() {
    if (!cropper || !borderGuide) return;

    const cropBoxData = cropper.getCropBoxData();
    if (!cropBoxData || cropBoxData.width === 0) return;

    borderGuide.style.display = 'block';
    borderGuide.style.left = `${cropBoxData.left}px`;
    borderGuide.style.top = `${cropBoxData.top}px`;
    borderGuide.style.width = `${cropBoxData.width}px`;
    borderGuide.style.height = `${cropBoxData.height}px`;

    const hookCenter = document.getElementById('hookCenterGuide');
    const hookLeft = document.getElementById('hookLeftGuide');
    const hookRight = document.getElementById('hookRightGuide');

    if (selectedHooks === 1) {
      if (hookCenter) hookCenter.style.display = 'block';
      if (hookLeft) hookLeft.style.display = 'none';
      if (hookRight) hookRight.style.display = 'none';
    } else {
      if (hookCenter) hookCenter.style.display = 'none';
      if (hookLeft) hookLeft.style.display = 'block';
      if (hookRight) hookRight.style.display = 'block';
    }
  }

  // --- Low-Resolution & DPI Check ---
  function checkDPIResolution() {
    if (!cropper || !resWarning) return;

    const cropData = cropper.getData(true);
    const targetPhysical = SHAPE_CONFIG[selectedShape];

    const targetWidthInches = targetPhysical.widthMM / 25.4;
    const targetHeightInches = targetPhysical.heightMM / 25.4;

    const dpiX = cropData.width / targetWidthInches;
    const dpiY = cropData.height / targetHeightInches;
    const effectiveDPI = Math.min(dpiX, dpiY);

    if (effectiveDPI < 150) {
      resWarning.style.display = 'flex';
    } else {
      resWarning.style.display = 'none';
    }
  }

  // --- Image Adjustment & Filter Controls ---
  function updateToneFilters() {
    const cVal = parseInt(contrastSlider.value, 10);
    const bVal = parseInt(brightnessSlider.value, 10);

    contrastVal.textContent = `${cVal > 0 ? '+' : ''}${cVal}%`;
    brightnessVal.textContent = `${bVal > 0 ? '+' : ''}${bVal}%`;

    const contrastPercent = 100 + cVal * 1.5;
    const brightnessPercent = 100 + bVal * 1.2;

    const filterString = `contrast(${contrastPercent}%) brightness(${brightnessPercent}%)`;

    const cropperImages = cropperWrapper.querySelectorAll('.cropper-container img');
    cropperImages.forEach(img => {
      img.style.filter = filterString;
    });
  }

  contrastSlider.addEventListener('input', updateToneFilters);
  brightnessSlider.addEventListener('input', updateToneFilters);

  btnResetAdjust.addEventListener('click', () => {
    contrastSlider.value = 0;
    brightnessSlider.value = 0;
    updateToneFilters();
  });

  // --- High-Res Pipeline Export Engine ---
  function generateHighResPrintCanvas() {
    if (!cropper) return null;

    const target = SHAPE_CONFIG[selectedShape].targetPixels;

    const croppedCanvas = cropper.getCroppedCanvas({
      width: target.w,
      height: target.h,
      imageSmoothingEnabled: true,
      imageSmoothingQuality: 'high'
    });

    const cVal = parseInt(contrastSlider.value, 10);
    const bVal = parseInt(brightnessSlider.value, 10);
    const contrastPercent = 100 + cVal * 1.5;
    const brightnessPercent = 100 + bVal * 1.2;

    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = target.w;
    exportCanvas.height = target.h;
    const ctx = exportCanvas.getContext('2d');

    ctx.filter = `contrast(${contrastPercent}%) brightness(${brightnessPercent}%)`;
    ctx.drawImage(croppedCanvas, 0, 0, target.w, target.h);

    if (selectedShape === 'circle') {
      ctx.globalCompositeOperation = 'destination-in';
      ctx.beginPath();
      const centerX = target.w / 2;
      const centerY = target.h / 2;
      const radius = Math.min(centerX, centerY);
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalCompositeOperation = 'source-over';
    }

    return exportCanvas;
  }

  function triggerFileDownload(filename, blobOrDataUrl) {
    const link = document.createElement('a');
    link.download = filename;
    if (typeof blobOrDataUrl === 'string') {
      link.href = blobOrDataUrl;
    } else {
      link.href = URL.createObjectURL(blobOrDataUrl);
    }
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  // --- Customer Submission & Pipeline Output Handler ---
  const btnSubmit = document.getElementById('btnSubmit');
  if (btnSubmit) {
    btnSubmit.addEventListener('click', () => {
      const name = document.getElementById('custName')?.value.trim();
      const email = document.getElementById('custEmail')?.value.trim();
      const notes = document.getElementById('notes')?.value.trim();
      const statusMsg = document.getElementById('statusMsg');

      if (!cropper) {
        alert('Please choose and position an image before submitting.');
        return;
      }

      if (!name || !email) {
        if (statusMsg) {
          statusMsg.style.color = '#ef4444';
          statusMsg.textContent = 'Please enter both your name and email.';
        }
        return;
      }

      const finalCanvas = generateHighResPrintCanvas();
      if (!finalCanvas) return;

      const sanitizedName = name.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      const timestamp = new Date().toISOString().slice(0, 10);
      const filePrefix = `${sanitizedName}_${selectedShape}_${timestamp}`;

      const config = SHAPE_CONFIG[selectedShape];
      const contrastVal = parseFloat(contrastSlider.value);
      const brightnessVal = parseFloat(brightnessSlider.value);

      const printManifest = {
        metadata: {
          clientName: name,
          clientEmail: email,
          orderDate: new Date().toISOString(),
          specialNotes: notes || 'None'
        },
        lithophaneParameters: {
          shape: selectedShape,
          dimensionsMM: {
            width: config.widthMM,
            height: config.heightMM,
            borderWidth: 3.0,          // Synchronized 3.0 mm border
            borderDepth: 3.2,          // Synchronized 3.2 mm frame depth
            imageThinnestLayer: 0.8,
            imageThickestLayer: 3.0
          },
          exportResolution: {
            pixelWidth: finalCanvas.width,
            pixelHeight: finalCanvas.height,
            targetDPI: 300
          },
          integratedHangingHooks: {
            count: selectedHooks,
            holeDiameterMM: 4.0,
            positions: selectedHooks === 1 ? ['center_top'] : ['top_left_20pct', 'top_right_80pct'],
            outerTabStyle: 'etsy_flush_fillet'
          },
          imageTone: {
            contrastSliderRaw: contrastVal,
            contrastMultiplier: (100 + contrastVal * 1.5) / 100,
            brightnessSliderRaw: brightnessVal,
            brightnessMultiplier: (100 + brightnessVal * 1.2) / 100
          },
          sourceFile: `${filePrefix}_litho_image.png`
        }
      };

      const jsonBlob = new Blob([JSON.stringify(printManifest, null, 2)], { type: 'application/json' });
      triggerFileDownload(`${filePrefix}_manifest.json`, jsonBlob);

      finalCanvas.toBlob((blob) => {
        triggerFileDownload(`${filePrefix}_litho_image.png`, blob);
      }, 'image/png');

      if (statusMsg) statusMsg.textContent = '';
      if (exportSuccess) {
        exportSuccess.style.display = 'block';
        exportSuccess.innerHTML = `
          <strong>✓ Print Package Exported!</strong>
          Generated: <code>${filePrefix}_litho_image.png</code> (${finalCanvas.width}×${finalCanvas.height} px @ 300 DPI)<br>
          Manifest: <code>${filePrefix}_manifest.json</code> with physical parameters.
        `;
      }
    });
  }
});

function convertToGrayscaleDataUrl(img) {
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth || img.width;
  canvas.height = img.naturalHeight || img.height;
  const ctx = canvas.getContext('2d');

  ctx.drawImage(img, 0, 0);
  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const data = imgData.data;

  for (let i = 0; i < data.length; i += 4) {
    const gray = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    data[i] = gray;
    data[i + 1] = gray;
    data[i + 2] = gray;
  }

  ctx.putImageData(imgData, 0, 0);
  return canvas.toDataURL('image/jpeg', 0.95);
}