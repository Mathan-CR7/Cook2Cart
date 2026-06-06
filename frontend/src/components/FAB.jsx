import { useNavigate, Link } from 'react-router-dom';

export default function FAB() {
  return (
    <Link
      to="/search"
      className="fixed bottom-24 right-6 w-14 h-14 gradient-bg text-white rounded-full shadow-2xl flex items-center justify-center active:scale-90 transition-transform z-50 hover:shadow-xl"
    >
      <span className="material-icon fill !text-white !text-2xl">auto_awesome</span>
    </Link>
  );
}
