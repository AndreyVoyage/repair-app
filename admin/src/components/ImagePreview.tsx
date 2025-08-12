interface Props {
  src: string;
  open: boolean;
  onClose: () => void;
}

export default function ImagePreview({ src, open, onClose }: Props) {
  return (
    <dialog
      open={open}
      onClose={onClose}
      style={{
        border: 'none',
        padding: 0,
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.8)',
        display: open ? 'flex' : 'none',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9999,
      }}
    >
      <img src={src} style={{ maxWidth: '90vw', maxHeight: '90vh' }} alt="preview" />
      <button
        onClick={onClose}
        style={{ position: 'absolute', top: 8, right: 8, background: '#fff', border: 'none' }}
      >
        ✖
      </button>
    </dialog>
  );
}