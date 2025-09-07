# 🧠 LLM-Powered Learning Disability Dashboard

An intelligent educational platform that uses Large Language Models (LLMs) to identify and support students with learning disabilities, particularly in mathematics. The system provides personalized learning experiences, adaptive assessments, and comprehensive analytics to help educators understand and address individual learning needs.

## 🌟 Features

### 🎯 Core Functionality
- **AI-Powered Disability Identification**: Advanced algorithms to detect potential learning disabilities
- **Personalized Learning Paths**: Customized educational content based on individual needs
- **Adaptive Assessments**: Dynamic question generation that adjusts to student performance
- **Real-time Analytics**: Comprehensive dashboards for educators and administrators
- **Interactive Simulations**: Hands-on learning experiences for complex concepts

### 🔧 Technical Features
- **Modern React Frontend**: Responsive, accessible user interface
- **FastAPI Backend**: High-performance API with automatic documentation
- **OpenAI Integration**: Leverages GPT models for intelligent content generation
- **Database Support**: SQLite integration for data persistence
- **CORS Enabled**: Cross-origin resource sharing for seamless integration

## 🏗️ Architecture

```
├── frontend/                 # React.js frontend application
│   └── ap-ui/
│       ├── src/
│       │   ├── Components/   # Reusable UI components
│       │   ├── Store/        # State management and data
│       │   └── Utils/        # Utility functions
│       └── public/           # Static assets
└── backend/                  # Python FastAPI backend
    └── LLM-Disability-Dashboard/
        ├── app/
        │   ├── Routes/       # API route handlers
        │   └── services/     # Business logic services
        ├── main.py          # Application entry point
        └── questions.json   # Sample question database
```

## 🚀 Getting Started

### Prerequisites
- **Node.js** (v16 or higher)
- **Python** (v3.9 or higher)
- **OpenAI API Key** (for AI functionality)

### Installation

#### 1. Clone the Repository
```bash
git clone https://github.com/AtharvRaotole/LLM-Powered-Learning-Disability.git
cd LLM-Powered-Learning-Disability
```

#### 2. Backend Setup
```bash
cd backend/LLM-Disability-Dashboard

# Create virtual environment
python -m venv venv

# Activate virtual environment
# On macOS/Linux:
source venv/bin/activate
# On Windows:
# venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Create environment file
echo "OPENAI_API_KEY=your_api_key_here" > .env

# Run the backend server
python main.py
```

#### 3. Frontend Setup
```bash
cd frontend/ap-ui

# Install dependencies
npm install

# Start the development server
npm start
```

### 🌐 Access the Application
- **Frontend**: http://localhost:3000
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs

## 📚 Usage

### For Educators
1. **Student Assessment**: Use the disability identification tool to assess students
2. **Customize Learning**: Create personalized learning paths based on identified needs
3. **Monitor Progress**: Track student performance through real-time analytics
4. **Generate Content**: Use AI to create adaptive questions and learning materials

### For Students
1. **Interactive Learning**: Engage with personalized educational content
2. **Practice Problems**: Work through adaptive math problems
3. **Progress Tracking**: Monitor your learning journey
4. **Accessibility Features**: Benefit from inclusive design principles

## 🔧 API Endpoints

### Core Endpoints
- `GET /api/v1/openai/` - Health check
- `POST /api/v1/openai/generate-questions` - Generate AI-powered questions
- `POST /api/v1/openai/analyze-responses` - Analyze student responses
- `GET /api/v1/openai/questions` - Retrieve question database

### Example API Usage
```python
import requests

# Generate questions
response = requests.post('http://localhost:8000/api/v1/openai/generate-questions', 
                        json={"topic": "fractions", "difficulty": "intermediate"})
questions = response.json()
```

## 🛠️ Development

### Backend Development
```bash
cd backend/LLM-Disability-Dashboard
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

### Frontend Development
```bash
cd frontend/ap-ui
npm start
```

### Running Tests
```bash
# Backend tests
cd backend/LLM-Disability-Dashboard
python -m pytest

# Frontend tests
cd frontend/ap-ui
npm test
```

## 📊 Sample Data

The application includes sample questions focused on mathematical concepts:

- **Fraction Operations**: Addition, subtraction, and comparison
- **Common Denominators**: Finding least common multiples
- **Visual Learning**: Number line representations
- **Mistake Analysis**: Common error patterns and solutions

## 🔒 Security & Privacy

- **API Key Protection**: Environment variables for sensitive data
- **CORS Configuration**: Secure cross-origin requests
- **Data Privacy**: Student data protection and compliance
- **Input Validation**: Robust data validation and sanitization

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **OpenAI** for providing powerful language models
- **FastAPI** for the excellent web framework
- **React** for the robust frontend library
- **Educational Research Community** for learning disability insights

## 📞 Support

For support, email [your-email@example.com] or create an issue in the repository.

## 🔮 Future Enhancements

- [ ] Multi-language support
- [ ] Advanced analytics dashboard
- [ ] Mobile application
- [ ] Integration with LMS platforms
- [ ] Voice recognition capabilities
- [ ] Augmented reality learning modules

---

**Built with ❤️ for inclusive education**