#!/usr/bin/env python3
"""
Database initialization script for SolarSpotting App.
This script initializes the database schema on a Neon PostgreSQL instance.

Usage:
    python -m backend.scripts.db_init
"""

import os
import sys
import argparse
import psycopg2
import logging
from pathlib import Path

# Add the project root to the Python path to allow imports
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))

from backend.core.config import settings, logger


def init_database(verbose=False, schema_path=None):
    """
    Initialize the database with the schema defined in schema.sql

    Args:
        verbose: Whether to print verbose output
        schema_path: Path to the schema.sql file (optional)
    """
    if verbose:
        logger.setLevel(logging.DEBUG)

    # Use the provided schema path or default to scripts/schema.sql
    if schema_path is None:
        script_dir = Path(__file__).resolve().parent
        schema_path = script_dir / "postgres_script.sql"

    logger.info(f"Using schema from: {schema_path}")

    # Check if schema file exists
    if not os.path.exists(schema_path):
        logger.error(f"Schema file not found: {schema_path}")
        return False

    try:
        # Read the schema SQL
        with open(schema_path, 'r') as f:
            schema_sql = f.read()
            logger.debug(f"Read {len(schema_sql)} bytes from schema file")

        # Connect to the database
        logger.info(f"Connecting to database...")
        conn = psycopg2.connect(settings.DATABASE_URL)
        conn.autocommit = False  # We want to use transactions

        # Execute the schema SQL
        logger.info("Executing schema SQL...")
        with conn.cursor() as cursor:
            cursor.execute(schema_sql)

        # Commit the transaction
        conn.commit()
        logger.info("Schema SQL executed successfully and changes committed")

        # Close the connection
        conn.close()
        logger.info("Database initialization completed successfully!")
        return True

    except Exception as e:
        logger.error(f"Database initialization failed: {e}")
        return False


def main():
    """Main entry point for the script."""
    parser = argparse.ArgumentParser(description="Initialize the SolarSpotting database")
    parser.add_argument("-v", "--verbose", action="store_true", help="Enable verbose output")
    parser.add_argument("-s", "--schema", help="Path to the schema SQL file", default=None)
    args = parser.parse_args()

    success = init_database(verbose=args.verbose, schema_path=args.schema)

    # Exit with appropriate code
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
    