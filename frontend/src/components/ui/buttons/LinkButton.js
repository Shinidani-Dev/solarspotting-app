import Link from "next/link";

export default function LinkButton({
  text, 
  link, 
  Icon,
  variant = 'primary',
  size = 'md',
  className = '',
  disabled = false,
  external = false,
  iconPosition = 'left',
  onClick
}) {
  // Base styles for all variants
  const baseStyles = "me-3 mt-3 inline-flex items-center justify-center font-medium rounded-md transition duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900";
  
  // Define different variants
  const variants = {
    primary: "bg-amber-500 text-slate-900 hover:bg-amber-400 hover:text-slate-900 active:bg-amber-600 focus:ring-amber-500",
    secondary: "bg-slate-700 text-slate-100 hover:bg-slate-600 active:bg-slate-800 border border-slate-600 focus:ring-slate-500",
    outline: "bg-transparent border border-amber-500 text-amber-500 hover:bg-amber-500 hover:text-slate-900 focus:ring-amber-500",
    ghost: "bg-transparent text-amber-400 hover:bg-slate-800 focus:ring-amber-400",
    danger: "bg-red-600 text-white hover:bg-red-500 active:bg-red-700 focus:ring-red-500",
    success: "bg-emerald-600 text-white hover:bg-emerald-500 active:bg-emerald-700 focus:ring-emerald-500",
  };
  
  // Define different sizes
  const sizes = {
    sm: "text-xs px-2.5 py-1.5",
    md: "text-sm px-4 py-2",
    lg: "text-base px-6 py-3",
  };
  
  // Handle disabled state
  const disabledStyles = disabled 
    ? "opacity-50 cursor-not-allowed pointer-events-none" 
    : "cursor-pointer";
  
  // Combine all styles
  const combinedStyles = `${baseStyles} ${variants[variant]} ${sizes[size]} ${disabledStyles} ${className}`;
  
  // Handle icon position
  const iconLeft = iconPosition === 'left' && Icon && <Icon className="flex-shrink-0 mr-2" size={size === 'lg' ? 20 : size === 'md' ? 18 : 16} />;
  const iconRight = iconPosition === 'right' && Icon && <Icon className="flex-shrink-0 ml-2" size={size === 'lg' ? 20 : size === 'md' ? 18 : 16} />;
  
  // For external links
  if (external) {
    return (
      <a 
        href={link}
        className={combinedStyles}
        target="_blank"
        rel="noopener noreferrer"
        onClick={onClick}
      >
        {iconLeft}
        <span>{text}</span>
        {iconRight}
      </a>
    );
  }
  
  // For internal links (Next.js Link)
  return (
    <Link 
      href={disabled ? "#" : link} 
      className={combinedStyles}
      onClick={disabled ? (e) => e.preventDefault() : onClick}
      aria-disabled={disabled}
    >
      {iconLeft}
      <span>{text}</span>
      {iconRight}
    </Link>
  );
}