export default function FaceScanPhoto({ src }: { src: string }) {
  return (
    <div className="face-scan-photo">
      <img src={src} alt="Фото для анализа" className="face-scan-img" />
    </div>
  );
}
