import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';
import type { Landmark } from './types';

let landmarker: FaceLandmarker | null = null;
let loading: Promise<FaceLandmarker> | null = null;

export async function initFaceLandmarker(onProgress?: (msg: string) => void): Promise<FaceLandmarker> {
  if (landmarker) return landmarker;
  if (loading) return loading;

  loading = (async () => {
    onProgress?.('Загрузка WASM...');
    const vision = await FilesetResolver.forVisionTasks(
      'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.18/wasm'
    );
    onProgress?.('Инициализация нейросети...');
    landmarker = await FaceLandmarker.createFromOptions(vision, {
      baseOptions: {
        modelAssetPath:
          'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
        delegate: 'GPU',
      },
      runningMode: 'IMAGE',
      numFaces: 2,
      outputFaceBlendshapes: false,
      outputFacialTransformationMatrixes: false,
    });
    onProgress?.('Готово!');
    return landmarker;
  })();

  return loading;
}

export async function detectLandmarks(
  imageSource: HTMLImageElement | HTMLCanvasElement
): Promise<Landmark[][]> {
  const fl = await initFaceLandmarker();
  const result = fl.detect(imageSource);

  if (!result.faceLandmarks || result.faceLandmarks.length === 0) {
    throw new Error('Лицо не обнаружено. Загрузи чёткое фронтальное фото.');
  }

  return result.faceLandmarks.map((face) =>
    face.map((lm) => ({ x: lm.x, y: lm.y, z: lm.z }))
  );
}

export function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Не удалось загрузить изображение'));
    img.src = URL.createObjectURL(file);
  });
}

export function hashImageData(data: ImageData): string {
  let h = 0;
  const step = Math.max(1, Math.floor(data.data.length / 1000));
  for (let i = 0; i < data.data.length; i += step) {
    h = (h << 5) - h + data.data[i];
    h |= 0;
  }
  return String(Math.abs(h));
}

export function imageToHash(img: HTMLImageElement): string {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, 0, 0, 64, 64);
  return hashImageData(ctx.getImageData(0, 0, 64, 64));
}
