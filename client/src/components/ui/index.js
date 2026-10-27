import React from "react";
import { motion } from "framer-motion";
import { twMerge } from "tailwind-merge";

// Button variants
const buttonVariants = {
  primary: "bg-blue-600 hover:bg-blue-700 text-white shadow-lg hover:shadow-xl",
  secondary:
    "bg-gray-200 hover:bg-gray-300 text-gray-900 dark:bg-gray-700 dark:hover:bg-gray-600 dark:text-white",
  success:
    "bg-green-600 hover:bg-green-700 text-white shadow-lg hover:shadow-xl",
  danger: "bg-red-600 hover:bg-red-700 text-white shadow-lg hover:shadow-xl",
  warning:
    "bg-yellow-600 hover:bg-yellow-700 text-white shadow-lg hover:shadow-xl",
  outline:
    "border-2 border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white",
  ghost: "text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20",
};

const buttonSizes = {
  sm: "px-3 py-2 text-sm min-h-[44px]", // Increased to meet touch target req
  md: "px-4 py-2 md:py-3 text-sm md:text-base min-h-[40px] md:min-h-[44px]",
  lg: "px-6 py-4 text-lg min-h-[56px]",
  xl: "px-8 py-4 text-xl min-h-[64px]",
};

export const Button = ({
  children,
  variant = "primary",
  size = "md",
  className = "",
  loading = false,
  disabled = false,
  icon: Icon,
  iconPosition = "left",
  animate = true,
  ...props
}) => {
  const baseClasses =
    "inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed";

  const classes = twMerge(
    baseClasses,
    buttonVariants[variant],
    buttonSizes[size],
    className
  );

  const ButtonComponent = animate ? motion.button : "button";

  const motionProps = animate
    ? {
        whileHover: { scale: 1.02 },
        whileTap: { scale: 0.98 },
        transition: { type: "spring", stiffness: 300, damping: 25 },
      }
    : {};

  return (
    <ButtonComponent
      className={classes}
      disabled={disabled || loading}
      {...motionProps}
      {...props}
    >
      {loading && (
        <svg
          className="animate-spin -ml-1 mr-3 h-5 w-5"
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          ></circle>
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
          ></path>
        </svg>
      )}

      {Icon && iconPosition === "left" && !loading && (
        <Icon className={`h-5 w-5 ${children ? "mr-2" : ""}`} />
      )}

      {children}

      {Icon && iconPosition === "right" && !loading && (
        <Icon className={`h-5 w-5 ${children ? "ml-2" : ""}`} />
      )}
    </ButtonComponent>
  );
};

// Input component
export const Input = ({
  label,
  error,
  helperText,
  icon: Icon,
  iconPosition = "left",
  rightElement,
  className = "",
  wrapperClassName = "",
  ...props
}) => {
  const inputClasses = twMerge(
    "block w-full px-3 py-2 md:py-3 text-sm md:text-base border border-gray-300 rounded-lg shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-white dark:placeholder-gray-300 min-h-[40px] md:min-h-[44px]",
    // Changed py-2 to py-3 and added text-base and min-h-[44px]
    error && "border-red-500 focus:ring-red-500 focus:border-red-500",
    Icon && iconPosition === "left" && "pl-8 md:pl-10",
    (Icon && iconPosition === "right") || rightElement ? "pr-10" : "",
    className
  );

  return (
    <div className={wrapperClassName}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          {label}
        </label>
      )}

      <div className="relative">
        {Icon && iconPosition === "left" && (
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Icon className="h-4 w-4 md:h-5 md:w-5 text-gray-400" />
          </div>
        )}

        <input className={inputClasses} {...props} />

        {Icon && iconPosition === "right" && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
            <Icon className="h-4 w-4 md:h-5 md:w-5 text-gray-400" />
          </div>
        )}

        {rightElement && (
          <div className="absolute inset-y-0 right-0 pr-3 flex items-center">
            {rightElement}
          </div>
        )}
      </div>

      {error && (
        <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>
      )}

      {helperText && !error && (
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          {helperText}
        </p>
      )}
    </div>
  );
};

// Card component
export const Card = ({
  children,
  className = "",
  padding = true,
  shadow = true,
  animate = true,
  ...props
}) => {
  const baseClasses = "bg-white dark:bg-gray-800 rounded-lg";

  const classes = twMerge(
    baseClasses,
    padding && "p-6",
    shadow && "shadow-lg",
    className
  );

  const CardComponent = animate ? motion.div : "div";

  const motionProps = animate
    ? {
        initial: { opacity: 0, y: 20 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.3 },
      }
    : {};

  return (
    <CardComponent className={classes} {...motionProps} {...props}>
      {children}
    </CardComponent>
  );
};

// Modal component
export const Modal = ({
  isOpen,
  onClose,
  title,
  children,
  size = "md",
  showCloseButton = true,
}) => {
  const sizeClasses = {
    sm: "max-w-md",
    md: "max-w-lg",
    lg: "max-w-2xl",
    xl: "max-w-4xl",
    full: "max-w-full mx-4",
  };

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 overflow-y-auto"
    >
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div
          className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
          onClick={onClose}
        />

        <span className="hidden sm:inline-block sm:align-middle sm:h-screen">
          &#8203;
        </span>

        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className={twMerge(
            "inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle w-full",
            sizeClasses[size]
          )}
        >
          {title && (
            <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
              <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                {title}
              </h3>
              {showCloseButton && (
                <button
                  onClick={onClose}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                >
                  <svg
                    className="h-6 w-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              )}
            </div>
          )}

          <div className="px-6 py-4">{children}</div>
        </motion.div>
      </div>
    </motion.div>
  );
};

// Loading spinner
export const LoadingSpinner = ({ size = "md", className = "" }) => {
  const sizeClasses = {
    sm: "h-4 w-4",
    md: "h-8 w-8",
    lg: "h-12 w-12",
    xl: "h-16 w-16",
  };

  return (
    <div className={twMerge("flex justify-center items-center", className)}>
      <div
        className={twMerge(
          "animate-spin rounded-full border-2 border-gray-300 border-t-blue-600",
          sizeClasses[size]
        )}
      />
    </div>
  );
};

// Badge component
export const Badge = ({
  children,
  variant = "primary",
  size = "md",
  className = "",
}) => {
  const variantClasses = {
    primary: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
    secondary: "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300",
    success:
      "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    danger: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
    warning:
      "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
  };

  const sizeClasses = {
    sm: "px-2 py-0.5 text-xs",
    md: "px-2.5 py-1 text-sm",
    lg: "px-3 py-1.5 text-base",
  };

  return (
    <span
      className={twMerge(
        "inline-flex items-center font-medium rounded-full",
        variantClasses[variant],
        sizeClasses[size],
        className
      )}
    >
      {children}
    </span>
  );
};

// Skeleton loader
export const Skeleton = ({ className = "", animate = true }) => {
  const baseClasses = "bg-gray-200 dark:bg-gray-700 rounded";

  return (
    <div
      className={twMerge(baseClasses, animate && "animate-pulse", className)}
    />
  );
};
