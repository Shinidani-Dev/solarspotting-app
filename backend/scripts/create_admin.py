#!/usr/bin/env python3
"""
Script to create an admin user for the SolarSpotting application.
Uses bcrypt and passlib for secure password hashing.

Usage:
    python -m backend.scripts.create_admin
"""

import sys
import os
import argparse
import psycopg2
import datetime
from pathlib import Path
from passlib.hash import bcrypt
sys.path.insert(0, str(Path(__file__).resolve().parent.parent.parent))
from backend.core.config import settings, logger


def create_admin_user(
        email=os.getenv("ADMIN_EMAIL", "admin@solarspotting.org"),
        username=os.getenv("ADMIN_USERNAME", "admin"),
        password=os.getenv("ADMIN_PASSWORD", "adminPassw0rd!"),
        firstname=os.getenv("ADMIN_FIRSTNAME", "Admin"),
        lastname=os.getenv("ADMIN_LASTNAME", "User"),
        verbose=False
):
    """
    Create an admin user with the specified details.

    Args:
        email: Email address for the admin user
        username: Username for the admin user
        password: Password for the admin user
        firstname: First name for the admin user
        lastname: Last name for the admin user
        verbose: Whether to print verbose output
    """
    try:
        # Hash the password using bcrypt
        hashed_password = bcrypt.hash(password)

        # Connect to the database
        logger.info("Connecting to database...")
        conn = psycopg2.connect(settings.DATABASE_URL)
        conn.autocommit = False  # We want to use transactions

        # Check if user already exists
        with conn.cursor() as cursor:
            cursor.execute("SELECT id FROM s_user WHERE email = %s OR username = %s", (email, username))
            existing_user = cursor.fetchone()

            if existing_user:
                logger.info(f"User with email {email} or username {username} already exists (ID: {existing_user[0]})")
                user_id = existing_user[0]

                # Update the existing user to be an admin
                cursor.execute("""
                    UPDATE s_user 
                    SET role = 'admin', hashed_pw = %s
                    WHERE id = %s
                """, (hashed_password, user_id))
                logger.info(f"Updated user {username} to admin role and reset password")
            else:
                # Create a new admin user
                cursor.execute("""
                    INSERT INTO s_user (
                        firstname, lastname, date_of_birth, gender,
                        street, postal_code, city, state, country,
                        email, username, hashed_pw, role, active
                    ) VALUES (
                        %s, %s, %s, 'male',
                        'Admin Street 1', '12345', 'Admin City', 'Admin State', 'CH',
                        %s, %s, %s, 'admin', TRUE
                    ) RETURNING id
                """, (firstname, lastname, datetime.date.today(), email, username, hashed_password))

                user_id = cursor.fetchone()[0]
                logger.info(f"Created new admin user with ID: {user_id}")

            # Check if observer record exists
            cursor.execute("SELECT id FROM s_observer WHERE user_id = %s", (user_id,))
            observer = cursor.fetchone()

            if not observer:
                # Create observer record
                cursor.execute("""
                    INSERT INTO s_observer (user_id, is_ai)
                    VALUES (%s, FALSE)
                """, (user_id,))
                logger.info(f"Created observer record for user ID: {user_id}")
            else:
                logger.info(f"Observer record already exists for user ID: {user_id}")

        # Commit the transaction
        conn.commit()
        logger.info("Admin user creation/update completed successfully")

        # Close the connection
        conn.close()
        return True

    except Exception as e:
        logger.error(f"Admin user creation failed: {e}")
        return False


def main():
    """Main entry point for the script."""
    parser = argparse.ArgumentParser(description="Create an admin user for SolarSpotting")
    parser.add_argument("-v", "--verbose", action="store_true", help="Enable verbose output")
    parser.add_argument("-e", "--email", default=os.getenv("ADMIN_EMAIL", "admin@solarspotting.org"),
                        help="Email for admin user")
    parser.add_argument("-u", "--username", default=os.getenv("ADMIN_USERNAME", "admin"),
                        help="Username for admin user")
    parser.add_argument("-p", "--password", default=os.getenv("ADMIN_PASSWORD", "adminPassw0rd!"),
                        help="Password for admin user")
    parser.add_argument("-f", "--firstname", default=os.getenv("ADMIN_FIRSTNAME", "Admin"),
                        help="First name for admin user")
    parser.add_argument("-l", "--lastname", default=os.getenv("ADMIN_LASTNAME", "User"),
                        help="Last name for admin user")

    args = parser.parse_args()

    success = create_admin_user(
        email=args.email,
        username=args.username,
        password=args.password,
        firstname=args.firstname,
        lastname=args.lastname,
        verbose=args.verbose
    )

    # Exit with appropriate code
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
