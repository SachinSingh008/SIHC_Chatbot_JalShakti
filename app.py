from flask import Flask, request, jsonify, render_template
import re
import google.generativeai as genai
import logging

app = Flask(__name__)

# Configure logging
logging.basicConfig(level=logging.DEBUG)

# Configure the Gemini AI
genai.configure(api_key='AIzaSyAO36_LDr2H1jojusoSo72mscY6lA6BQO4')
model = genai.GenerativeModel('gemini-pro')

responses = {
    r"water level|groundwater level": """The water level scenario varies across different regions of India. Here are some key points:

1. **Seasonal variations** affect groundwater levels
2. Many areas face **declining trends** due to over-extraction
3. **Monsoon recharge** is crucial for replenishing aquifers
4. **Real-time monitoring** is done through a network of observation wells""",

    r"hydrogeology|hydrogeological": """The hydrogeological scenario in India is diverse. Key aspects include:

1. **Varied aquifer systems** across the country
2. **Hard rock aquifers** in peninsular India
3. **Alluvial aquifers** in Indo-Gangetic plains
4. **Coastal aquifers** with unique challenges
5. **Mountainous regions** with complex hydrogeology""",

    r"water quality|groundwater quality": """Groundwater quality in India varies widely:

1. **Naturally occurring contaminants** like arsenic and fluoride in some areas
2. **Anthropogenic pollution** from industrial and agricultural activities
3. **Salinity issues** in coastal and arid regions
4. Regular **water quality monitoring** is conducted by CGWB
5. **Treatment technologies** are recommended based on specific contaminants""",
}

def get_gemini_response(prompt):
    try:
        response = model.generate_content(prompt)
        return response.text
    except Exception as e:
        logging.error(f"Error in get_gemini_response: {str(e)}")
        return None

@app.route('/get_response', methods=['POST'])
def chatbot_response():
    try:
        user_input = request.json['message']
        is_first_message = request.json.get('is_first_message', False)
        logging.info(f"Received user input: {user_input}")
        
        response = get_response(user_input, is_first_message)
        
        if response is None:
            return jsonify({'error': 'Failed to generate response'}), 500
        
        logging.info(f"Sending response: {response}")
        return jsonify({'response': response})
    except Exception as e:
        logging.error(f"Error in chatbot_response: {str(e)}")
        return jsonify({'error': 'Internal server error'}), 500

def get_response(user_input, is_first_message):
    user_input = user_input.lower()
    
    for pattern, response in responses.items():
        if re.search(pattern, user_input):
            return response
    
    gemini_prompt = f"""As Jal Mitra, an AI assistant for groundwater information in India, provide a response to this query:
    {user_input}    
    
    Structure your response as follows:
    1. A brief, direct answer (1-2 sentences).
    2. If the topic requires more explanation, add "Here are some key points:" followed by 3-5 concise bullet points.
    
    Focus on groundwater-related topics such as water level scenarios, hydrogeological information, water quality, available reports, groundwater resource assessment, area categorization, management practices, NOC procedures, and relevant definitions.
    Use **bold** for key terms."""
    
    gemini_response = get_gemini_response(gemini_prompt)
    return gemini_response if gemini_response else "I'm sorry, I couldn't generate a response at the moment. Please try again."

@app.route('/get_details', methods=['POST'])
def get_details():
    message = request.json['message']
    gemini_prompt = f"""As Jal Mitra, an AI assistant for groundwater information in India, provide more detailed information about this topic:
    {message}
    Focus on groundwater-related matters, including scientific data, management practices, and regulatory information.
    Keep the response concise. Use **bold** for key terms."""
    
    gemini_response = get_gemini_response(gemini_prompt)
    return jsonify({'response': gemini_response})

@app.route('/generate_report', methods=['POST'])
def generate_report():
    area_of_interest = request.json['area_of_interest']
    gemini_prompt = f"""Generate a comprehensive report for the area: {area_of_interest}. Include the following sections:

    1. Ground Water Resource Assessment
    2. Categorization of the area
    3. Groundwater management practices to be adopted
    4. Conditions for obtaining NOC for groundwater extraction
    5. Guidance on how to obtain NOC
    6. Brief definitions of key groundwater terms
    7. Available training opportunities related to groundwater

    Provide concise, factual information for each section. Use **bold** for section headings and key terms."""
    
    gemini_response = get_gemini_response(gemini_prompt)
    return jsonify({'report': gemini_response})

@app.route('/')
def home():
    return render_template('index.html')

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)