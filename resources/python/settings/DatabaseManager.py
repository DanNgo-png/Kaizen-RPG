import duckdb
import os
from Config import DB_FILE, TABLE_NAME

def connect_db():
    """Connects to or creates the file-backed DuckDB database."""
    con = duckdb.connect(database=DB_FILE)

    # Create the table if it doesn't exist and insert initial amount if empty
    con.execute(f"""
        CREATE TABLE IF NOT EXISTS {TABLE_NAME} (
            amount INTEGER
        );
    """)
    # Initialize amount if table is empty
    if con.execute(f"SELECT COUNT(*) FROM {TABLE_NAME};").fetchone()[0] == 0:
        con.execute(f"INSERT INTO {TABLE_NAME} (amount) VALUES (100);")
    return con

def get_amount(con):
    """Retrieves the current amount from the database."""
    result = con.execute(f"SELECT amount FROM {TABLE_NAME};").fetchone()
    return result[0] if result else 0

def update_amount(con, amount_change):
    """Updates the amount in the database."""
    current_amount = get_amount(con)
    new_amount = current_amount + amount_change
    con.execute(f"UPDATE {TABLE_NAME} SET amount = {new_amount};")
    con.commit()
    return new_amount

def display_amount(con):
    """Displays the current amount."""
    current_amount = get_amount(con)
    print(f"💰 Current amount: ${current_amount}")

def export_data(con, format_type):
    """Exports data from the player_balance table to a specified format (CSV or JSON)."""
    output_dir = os.path.join(os.path.dirname(os.path.dirname(DB_FILE)), "readable_data")
    os.makedirs(output_dir, exist_ok=True)
    output_file = os.path.join(output_dir, f"player_balance_export.{format_type}")

    try:
        if format_type == "csv":
            con.execute(f"COPY {TABLE_NAME} TO '{output_file}' (HEADER, DELIMITER ',');")
        elif format_type == "json":
            con.execute(f"COPY {TABLE_NAME} TO '{output_file}' (FORMAT JSON);")
        else:
            print("🚫 Invalid format. Please choose 'csv' or 'json'.")
            return
        print(f"✅ Data exported successfully to {output_file}")
    except Exception as e:
        print(f"🚨 Error exporting data: {e}")

def import_data(con, format_type):
    """Imports data into the player_balance table from a specified format (CSV or JSON)."""
    input_dir = os.path.join(os.path.dirname(os.path.dirname(DB_FILE)), "readable_data")
    input_file = os.path.join(input_dir, f"player_balance_export.{format_type}") # Use the same filename as export

    if not os.path.exists(input_file):
        print(f"🚫 Import file not found: {input_file}")
        return

    try:
        # Read the amount from the imported file
        imported_amount = 0
        if format_type == "csv":
            # Assuming CSV has a header and the amount is in the first column
            result = con.execute(f"SELECT amount FROM read_csv_auto('{input_file}');").fetchone()
            if result:
                imported_amount = result[0]
        elif format_type == "json":
            # Assuming JSON has a single object with an 'amount' key
            result = con.execute(f"SELECT amount FROM read_json_auto('{input_file}');").fetchone()
            if result:
                imported_amount = result[0]
        else:
            print("🚫 Invalid format. Please choose 'csv' or 'json'.")
            return
        
        if imported_amount is not None:
            # Clear existing data and insert the new amount
            con.execute(f"DELETE FROM {TABLE_NAME};")
            con.execute(f"INSERT INTO {TABLE_NAME} (amount) VALUES ({imported_amount});")
            con.commit()
            print(f"✅ Data imported successfully from {input_file}. New balance: {imported_amount}")
        else:
            print(f"🚫 Could not read amount from {input_file}")

    except Exception as e:
        print(f"🚨 Error importing data: {e}")