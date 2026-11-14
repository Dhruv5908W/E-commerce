import { Link } from "react-router-dom";

const NotFound = () => {
  return (
    <div className="bg-ink text-paper min-h-[70vh] flex flex-col items-center justify-center px-6 text-center">
      <h1 className="font-display text-[22vw] md:text-[10rem] leading-none text-emerald">404</h1>
      <p className="font-display text-2xl uppercase mb-3 text-gold">Page not found</p>
      <p className="text-paper/55 text-sm max-w-sm mb-8">
        The page you&apos;re looking for doesn&apos;t exist, got moved, or is no longer available.
      </p>
      <Link
        to="/"
        className="bg-emerald text-ink font-bold px-6 py-3 rounded-full hover:bg-gold transition-colors"
      >
        Back to shop
      </Link>
    </div>
  );
};

export default NotFound;
