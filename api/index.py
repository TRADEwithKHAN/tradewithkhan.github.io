from flask import Flask, request, jsonify

app = Flask(__name__)

@app.route('/api/login', methods=['POST'])
def login():
    data = request.get_json()
    email = data.get('email')
    password = data.get('password')
    
    # Yahan aap apna logic check kar sakte hain
    if email == "ksarimul2@gmail.com" and password == "Sarimul@a1":
        return jsonify({"success": True, "message": "Login successful!"}), 200
    else:
        return jsonify({"success": False, "message": "Invalid credentials"}), 401

# Vercel ko serverless function chahiye hota hai
def handler(request):
    return app(request)
  
