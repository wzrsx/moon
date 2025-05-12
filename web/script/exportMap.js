let loadedImagesCache = {};
async function exportMapToPNG() {
    // Проверяем, есть ли модули
    if (!cachedModules || cachedModules.length === 0) {
      alert('Нет модулей для экспорта');
      return;
    }
  
    // Находим границы всех модулей
    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;
  
    cachedModules.forEach(module => {
      const [x, y] = module.points;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x);
      maxY = Math.max(maxY, y);
    });
  
    // Добавляем буфер
    const buffer = 10000; // 10 км
    minX -= buffer;
    minY -= buffer;
    maxX += buffer;
    maxY += buffer;
  
    const width = 2000;
    const height = Math.round(width * (maxY - minY) / (maxX - minX));
    const extent = [minX, minY, maxX, maxY];
    try {
      // Загружаем слои как изображения
      const ldem_img = await getImageMap('LDEM_83S_10MPP_ADJ', extent);
      const hill_img = await getImageMap('LDEM_83S_10MPP_ADJ_HILL', extent);
      const ldsm_img = await getImageMap('LDSM_83S_10MPP_ADJ', extent);
  
      // Создаём canvas и комбинируем изображения
      const resultCanvas = combineImages(ldem_img, hill_img, ldsm_img, width, height);
      const modulesLayer = map.getLayers().getArray().find(layer =>
        layer.get('name') === 'modules_layer'
      );
  
      if (!modulesLayer) {
        console.warn('Слой модулей не найден');
        return;
      }
  
      const source = modulesLayer.getSource();
      const features = source.getFeatures();
  
      const view = map.getView();
      const exportZoom = 14;
      const resolution = (extent[2] - extent[0]) / width;
  
      // Предзагрузка иконок
      await preloadIcons(features, createModuleStyleFunction, exportZoom, resolution);
  
      // Отрисовываем векторные объекты
      drawVectorLayerOnCanvas(resultCanvas, map, extent);
  
      // Скачиваем результат
      const link = document.createElement('a');
      link.href = resultCanvas.toDataURL('image/png');
      link.download = 'modules_export.png';
      link.click();
  
      console.log("Экспорт успешен");
    } catch (err) {
      console.error("Ошибка при экспорте:", err);
      alert('Произошла ошибка при экспорте');
    }
}
function combineImages(baseImage, hillshadeImage, ldsmImage, width, height) {
  // Создаем canvas для результата
  const canvas = document.createElement('canvas');
  canvas.width = baseImage.width;
  canvas.height = baseImage.height;
  const ctx = canvas.getContext('2d');
  
  // 1. Рисуем базовый слой 
  ctx.drawImage(baseImage, 0, 0);
  
  // 2. Применяем слой LDSM 
  ctx.save();
  ctx.globalCompositeOperation = 'multiply';
  ctx.drawImage(ldsmImage, 0, 0);
  ctx.restore();
  
  // 3. Применяем слой hillshade 
  ctx.save();
  ctx.globalAlpha = 0.8;
  ctx.globalCompositeOperation = 'lighten';
  ctx.drawImage(hillshadeImage, 0, 0);
  ctx.restore();
  return canvas;
}
async function getImageMap(layerName, extent, targetSize = 2048) {//targetSize для разрешения фото
    const [minX, minY, maxX, maxY] = extent;
    const extentWidth = maxX - minX;
    const extentHeight = maxY - minY;
    const aspectRatio = extentWidth / extentHeight;
    
    let width, height;
    if (aspectRatio > 1) {
        width = targetSize;
        height = Math.round(targetSize / aspectRatio);
    } else {
        height = targetSize;
        width = Math.round(targetSize * aspectRatio);
    }

    const wmsUrl = new URL('http://localhost:8080/geoserver/wms');
    const params = new URLSearchParams({
        SERVICE: 'WMS',
        VERSION: '1.3.0',
        REQUEST: 'GetMap',
        LAYERS: `moon_workspace:${layerName}`,
        FORMAT: 'image/png',
        TRANSPARENT: 'true',
        WIDTH: width.toString(),
        HEIGHT: height.toString(),
        BBOX: extent.join(','),
        SRS: 'EPSG:100000'
    });

    wmsUrl.search = params.toString();

    return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error(`Failed to load image for layer ${layerName}`));
        img.src = wmsUrl.toString();
    });
}


//модули
function drawVectorLayerOnCanvas(canvas, map, extent) {
  const ctx = canvas.getContext('2d');
  const view = map.getView();
  const modulesLayer = map.getLayers().getArray().find(layer =>
    layer.get('name') === 'modules_layer'
  );

  if (!modulesLayer) {
    console.warn('Слой модулей не найден');
    return;
  }

  const source = modulesLayer.getSource();
  const features = source.getFeatures();

  const mapExtent = extent;
  const canvasWidth = canvas.width;
  const canvasHeight = canvas.height;
  // Простое проецирование: преобразование координат в пиксели
  function coordinateToPixel(coord) {
    const x = ((coord[0] - mapExtent[0]) / (mapExtent[2] - mapExtent[0])) * canvasWidth;
    const y = ((mapExtent[3] - coord[1]) / (mapExtent[3] - mapExtent[1])) * canvasHeight;
    return [x, y];
  }

  // Текущее разрешение (для выбора стиля)
  const resolution = (mapExtent[2] - mapExtent[0]) / canvasWidth;
  const zoom = Math.round(view.getZoomForResolution(resolution));
  console.log("zoom", zoom);
  features.forEach(feature => {
    const styles = createModuleStyleFunction(zoom)(feature, resolution);
    const styleArray = Array.isArray(styles) ? styles : [styles];

    styleArray.forEach(style => {
      let geometry = feature.getGeometry();
      if (style.getGeometryFunction()) {
        geometry = style.getGeometryFunction()(feature);
      }

      if (!geometry) return;

      const geomType = geometry.getType();

      if (geomType === 'Point') {
        const coords = geometry.getCoordinates();
        const pixel = coordinateToPixel(coords);
        drawPoint(ctx, style, pixel, zoom);
      } else if (geomType === 'Polygon') {
        const coords = geometry.getCoordinates()[0]; // внешний контур
        const pixels = coords.map(coordinateToPixel);
        drawPolygon(ctx, style, pixels);
      }

      const textStyle = style.getText();
      if (textStyle) {
        let textCoords;
        if (geomType === 'Point') {
          textCoords = geometry.getCoordinates();
        } else {
          const interiorPoint = geometry.getInteriorPoint();
          textCoords = interiorPoint.getCoordinates();
        }
        const textPixel = coordinateToPixel(textCoords);
        drawText(ctx, textStyle, textPixel[0], textPixel[1]);
      }
    });
  });
}

// Вспомогательные функции для отрисовки
function drawPoint(ctx, style, pixel, zoom) {
  const imageStyle = style.getImage();

  if (!imageStyle) {
    console.warn('Нет изображения в стиле');
    return;
  }

  // Если это Icon
  if (imageStyle instanceof ol.style.Icon) {
    const iconSrc = imageStyle.getSrc();
    const img = loadedImagesCache[iconSrc];

    if (!img || !img.complete || !img.width || !img.height) {
      console.warn("Изображение не загружено или неверно", iconSrc);
      return;
    }
    const iconScale = 0.1 * Math.pow(0.8, 16 - zoom);
    // Вычисляем новые размеры с учётом scale
    const scaledWidth = img.width * iconScale;
    const scaledHeight = img.height * iconScale;
    ctx.drawImage(
      img,
      pixel[0] - scaledWidth / 2,
      pixel[1] - scaledHeight / 2,
      scaledWidth,
      scaledHeight
    );
  } else if (imageStyle instanceof ol.style.Circle) {
    console.log("circle");
    const radius = imageStyle.getRadius();
    const fill = imageStyle.getFill();
    const stroke = imageStyle.getStroke();

    ctx.beginPath();
    ctx.arc(pixel[0], pixel[1], radius, 0, Math.PI * 2);

    if (fill) {
      ctx.fillStyle = fill.getColor();
      ctx.fill();
    }

    if (stroke) {
      ctx.strokeStyle = stroke.getColor();
      ctx.lineWidth = stroke.getWidth();
      ctx.stroke();
    }

  } else {
    console.warn('Неизвестный тип изображения', imageStyle);
  }
}
function drawPolygon(ctx, style, geometry, transform) {
  console.log("drawPolygon");
  const coordinates = geometry.getCoordinates()[0]; // Берем только внешнее кольцо
  const fill = style.getFill();
  const stroke = style.getStroke();
  
  if (!fill && !stroke) return;
  
  ctx.beginPath();
  
  coordinates.forEach((coord, i) => {
    const pixel = transform(coord);
    if (i === 0) {
      ctx.moveTo(pixel[0], pixel[1]);
    } else {
      ctx.lineTo(pixel[0], pixel[1]);
    }
  });
  
  ctx.closePath();
  
  if (fill) {
    ctx.fillStyle = fill.getColor();
    ctx.fill();
  }
  
  if (stroke) {
    ctx.strokeStyle = stroke.getColor();
    ctx.lineWidth = stroke.getWidth();
    ctx.stroke();
  }
}

function drawText(ctx, textStyle, x, y) {
  ctx.save();
  ctx.font = 'normal 14px Jura'; //настроить размер to do
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
    
  ctx.fillText(textStyle.getText(), x, y + (textStyle.getOffsetY() || 0));
  ctx.restore();
}
function preloadIcons(features, createStyleFunction, zoom, resolution) {
  const promises = [];
  loadedImagesCache = {}; 
  features.forEach(feature => {
    const style = createStyleFunction(zoom)(feature, resolution);
    const imageStyle = style.getImage();

    if (imageStyle instanceof ol.style.Icon) {
      const iconSrc = imageStyle.getSrc(); // Получаем исходный путь к изображению

      // Создаём новое изображение и начинаем загрузку вручную
      const img = new Image();
      img.src = iconSrc;
      loadedImagesCache[iconSrc] = img;
      // Для отладки
      console.log("Загружаем иконку:", iconSrc);

      promises.push(new Promise(resolve => {
        if (img.complete && img.naturalWidth !== 0) {
          console.log("Иконка уже загружена:", iconSrc);
          resolve();
          return;
        }

        img.onload = () => {
          console.log("Иконка загружена:", iconSrc);
          resolve();  
        };

        img.onerror = () => {
          console.warn("Ошибка загрузки иконки:", iconSrc);
          resolve();
        };
      }));
    }
  });

  return Promise.all(promises);
}