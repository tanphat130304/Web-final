import uvicorn
from app import create_app
from fastapi.middleware.cors import CORSMiddleware

app = create_app()

# Configure CORS
origins = [
    "http://localhost",
    "http://localhost:3000", # Add your frontend origin here
    "http://localhost:8000",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    uvicorn.run("app.main:app", host="localhost", port=8000, reload=True)