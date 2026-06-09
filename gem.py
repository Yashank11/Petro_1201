import pandas as pd
import google.generativeai as genai
import asyncio
import json
import os

# --- CONFIGURATION ---
API_KEY = "AIzaSyA-orJZwBwHlZTYLgY2h31mO19qrnrXKIU"
MODEL_NAME = "gemini-3.1-flash-lite" # As requested
INPUT_FILE = "petro_flares1.csv"
OUTPUT_FILE = "well_data_updated.csv"
BATCH_SIZE = 50

genai.configure(api_key=API_KEY)
model = genai.GenerativeModel(MODEL_NAME)

async def process_batch(batch_df):
    """
    Sends 50 records to Gemini and returns the identified company names.
    """
    # Convert data to a JSON string for the prompt
    # We include Well/Basin, Country, Lat, Lon, and Landmark as requested
    records = batch_df.to_dict(orient='records')
    
    prompt = f"""
    You are an expert in global energy infrastructure. 
    I have a list of oil/gas wells with coordinates and landmarks.
    
    Task: Identify the 'Company' that owns/operates each well.
    
    Logic:
    1. Look for the exact owner based on the Well Name, coordinates, and landmark.
    2. If the exact owner is unknown, identify the company with the maximum number of wells (dominant operator) in that specific Basin or Area.
    
    Return the result ONLY as a JSON list of strings (company names) in the same order as the input.
    
    Data:
    {json.dumps(records)}
    """

    try:
        response = await model.generate_content_async(prompt)
        # Clean the response in case the model returns markdown code blocks
        clean_json = response.text.strip().replace('```json', '').replace('```', '')
        company_list = json.loads(clean_json)
        
        if len(company_list) != len(batch_df):
            return ["Error: Size Mismatch"] * len(batch_df)
            
        return company_list
    except Exception as e:
        print(f"Error processing batch: {e}")
        return [None] * len(batch_df)

async def main():
    # Load the CSV
    if not os.path.exists(INPUT_FILE):
        print(f"File {INPUT_FILE} not found.")
        return

    df = pd.read_csv(INPUT_FILE)
    
    # Ensure 'Company' column exists for the output
    if 'Company' not in df.columns:
        df['Company'] = None

    # Identify rows where the Company is empty
    mask = df['Company'].isna() | (df['Company'] == "")
    rows_to_process = df[mask].copy()
    
    if rows_to_process.empty:
        print("No empty company entries found to process.")
        return

    print(f"Starting concurrent calls for {len(rows_to_process)} entries...")

    # Create batches of 50
    tasks = []
    for i in range(0, len(rows_to_process), BATCH_SIZE):
        batch = rows_to_process.iloc[i : i + BATCH_SIZE]
        tasks.append(process_batch(batch))

    # Execute all batches concurrently
    results = await asyncio.gather(*tasks)

    # Flatten the results and update the dataframe
    flattened_results = [item for sublist in results for item in sublist]
    df.loc[mask, 'Company'] = flattened_results

    # Save to new CSV
    df.to_csv(OUTPUT_FILE, index=False)
    print(f"Success! Updated file saved as {OUTPUT_FILE}")

if __name__ == "__main__":
    asyncio.run(main())