import os
import json
import logging
from logging.handlers import RotatingFileHandler
from pathlib import Path
from typing import Optional, Union

try:
    # Get the directory of the current module (LoggingHelper.py)
    CURRENT_FILE = Path(__file__).resolve()
    HELPERS_DIR = CURRENT_FILE.parent
    BACKEND_DIR = HELPERS_DIR.parent

    # Hard-code the logs directory inside the backend directory
    LOGS_DIR = os.path.join(BACKEND_DIR, "logs")

    print(f"LoggingHelper location: {CURRENT_FILE}")
    print(f"Backend directory: {BACKEND_DIR}")
    print(f"Logs directory: {LOGS_DIR}")
except Exception as e:
    print(f"Error determining paths: {str(e)}")
    # Fallback
    BACKEND_DIR = Path(os.getcwd())
    LOGS_DIR = os.path.join(BACKEND_DIR, "logs")
    print(f"Fallback backend directory: {BACKEND_DIR}")
    print(f"Fallback logs directory: {LOGS_DIR}")

# Now try to import settings
try:
    from backend.core.config import settings

    has_settings = True
    print("Successfully imported settings")
except Exception as e:
    print(f"Settings import failed: {str(e)}")
    has_settings = False


class CustomJsonFormatter(logging.Formatter):
    """Formats log records as JSON with custom fields"""

    def format(self, record):
        # Get custom module name or fall back to original
        custom_module = getattr(record, 'custom_module', record.name)

        log_data = {
            'timestamp': self.formatTime(record, self.datefmt),
            'level': record.levelname,
            'message': record.getMessage(),
            'module': custom_module,
        }

        # Add other custom fields from record
        for key, value in record.__dict__.items():
            if key.startswith('custom_') and key != 'custom_module':
                # Strip 'custom_' prefix for cleaner output
                log_data[key[7:]] = value

        # Add exception info if present
        if record.exc_info:
            log_data['exception'] = self.formatException(record.exc_info)

        return json.dumps(log_data)


class CustomTextFormatter(logging.Formatter):
    """Formats log records as text with custom module field"""

    def format(self, record):
        # Save original values
        original_name = record.name

        # Replace name with custom_module if present
        if hasattr(record, 'custom_module'):
            record.name = record.custom_module

        # Format the record
        result = super().format(record)

        # Restore original values
        record.name = original_name

        return result


class LoggingHelper:
    """
    Helper class for logging operations.
    Provides consistent logging across the application.
    """

    _initialized = False
    _root_logger = None
    _file_handler = None
    _console_handler = None

    @classmethod
    def initialize(cls):
        """Initialize the logging system"""
        if cls._initialized:
            return

        try:
            # Make sure the logs directory exists
            os.makedirs(LOGS_DIR, exist_ok=True)
            print(f"Created/verified logs directory: {LOGS_DIR}")
        except Exception as e:
            print(f"Error creating logs directory: {str(e)}")
            return

        # ----- Set up log file path -----
        # Default log file is always app.log in the LOGS_DIR
        log_file = os.path.join(LOGS_DIR, "app.log")

        # Log level
        if has_settings and hasattr(settings, 'DEBUG') and settings.DEBUG:
            log_level = logging.DEBUG
        else:
            log_level = logging.INFO

        # Log format
        if has_settings and hasattr(settings, 'LOG_FORMAT'):
            log_format = settings.LOG_FORMAT.lower()
        else:
            log_format = 'text'

        # ----- Set up logging -----
        # Configure root logger
        cls._root_logger = logging.getLogger()
        cls._root_logger.setLevel(log_level)

        # Remove any existing handlers
        for handler in cls._root_logger.handlers[:]:
            cls._root_logger.removeHandler(handler)

        # Create formatters
        if log_format == 'json':
            file_formatter = CustomJsonFormatter()
            console_formatter = CustomJsonFormatter()
        else:
            file_formatter = CustomTextFormatter('[%(asctime)s] [%(levelname)s] [%(name)s] %(message)s')
            console_formatter = CustomTextFormatter('[%(asctime)s] [%(levelname)s] [%(name)s] %(message)s')

        # File handler
        try:
            cls._file_handler = RotatingFileHandler(
                log_file,
                maxBytes=10 * 1024 * 1024,  # 10 MB
                backupCount=5
            )
            cls._file_handler.setFormatter(file_formatter)
            cls._root_logger.addHandler(cls._file_handler)
            print(f"Log file handler set up successfully: {log_file}")

            # Test write to the log file
            test_logger = logging.getLogger("LoggingHelper")
            test_logger.info("Log file test message")
            print("Test message written to log file")
        except Exception as e:
            print(f"Error setting up file handler: {str(e)}")
            # Try to get more details about the file access
            try:
                print(f"Log directory exists: {os.path.exists(os.path.dirname(log_file))}")
                print(f"Log directory is writable: {os.access(os.path.dirname(log_file), os.W_OK)}")
                print(f"Log file exists: {os.path.exists(log_file)}")
                if os.path.exists(log_file):
                    print(f"Log file is writable: {os.access(log_file, os.W_OK)}")
            except Exception as dir_error:
                print(f"Error checking directory permissions: {str(dir_error)}")

        # Console handler
        cls._console_handler = logging.StreamHandler()
        cls._console_handler.setFormatter(console_formatter)
        cls._root_logger.addHandler(cls._console_handler)

        # Log initialization message
        init_logger = logging.getLogger("LoggingHelper")
        init_logger.info(f"Logging initialized. Level: {logging.getLevelName(log_level)}, Format: {log_format}")
        init_logger.info(f"Log file: {log_file}")

        cls._initialized = True
        print(f"LoggingHelper initialization completed. Log file: {log_file}")

    @classmethod
    def log(cls, level: int, message: str, module: str = None, **kwargs):
        """
        Log a message with the specified level

        Args:
            level: Logging level (logging.INFO, logging.ERROR, etc.)
            message: Message to log
            module: Module name to use in the log
            **kwargs: Additional custom fields to include
        """
        if not cls._initialized:
            cls.initialize()

        # Default to 'app' if no module provided
        module = module or 'app'

        # Create logger for the module
        logger = logging.getLogger(module)

        # Add custom fields
        extra = {'custom_module': module}
        for key, value in kwargs.items():
            extra[f'custom_{key}'] = value

        # Log the message
        logger.log(level, message, extra=extra)

    @classmethod
    def debug(cls, message: str, module: str = None, **kwargs):
        """Log a debug message"""
        cls.log(logging.DEBUG, message, module, **kwargs)

    @classmethod
    def info(cls, message: str, module: str = None, **kwargs):
        """Log an info message"""
        cls.log(logging.INFO, message, module, **kwargs)

    @classmethod
    def warning(cls, message: str, module: str = None, **kwargs):
        """Log a warning message"""
        cls.log(logging.WARNING, message, module, **kwargs)

    @classmethod
    def error(cls, message: str, module: str = None, **kwargs):
        """Log an error message"""
        cls.log(logging.ERROR, message, module, **kwargs)

    @classmethod
    def critical(cls, message: str, module: str = None, **kwargs):
        """Log a critical message"""
        cls.log(logging.CRITICAL, message, module, **kwargs)

    @classmethod
    def exception(cls, message: str, module: str = None, **kwargs):
        """Log an exception with traceback"""
        if not cls._initialized:
            cls.initialize()

        # Default to 'app' if no module provided
        module = module or 'app'

        # Create logger for the module
        logger = logging.getLogger(module)

        # Add custom fields
        extra = {'custom_module': module}
        for key, value in kwargs.items():
            extra[f'custom_{key}'] = value

        # Log the exception
        logger.exception(message, extra=extra)

    @classmethod
    def log_request(cls, request_method: str, request_path: str, status_code: int,
                    execution_time: float, user_id: Optional[Union[int, str]] = None):
        """Log an API request"""
        kwargs = {
            'method': request_method,
            'path': request_path,
            'status_code': status_code,
            'time': f"{execution_time:.4f}s"
        }

        if user_id:
            kwargs['user_id'] = user_id

        message = f"{request_method} {request_path} - {status_code} - {kwargs['time']}"
        module = 'api.request'

        if status_code >= 500:
            cls.error(message, module, **kwargs)
        elif status_code >= 400:
            cls.warning(message, module, **kwargs)
        else:
            cls.info(message, module, **kwargs)