import uvicorn
from app import create_app

app = create_app()

@app.get("/health")
async def health_check():
    return {"status": "healthy"}

if __name__ == "__main__":
    uvicorn.run("app.main:app", host="localhost", port=8000, reload=True)