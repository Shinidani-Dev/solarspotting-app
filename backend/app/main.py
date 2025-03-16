from fastapi import FastAPI

app = FastAPI()


@app.get("/")
async def read_root():
    return {"message": "Welcome Astronomer to the SolarSpotting Backend!"}


@app.get("/health")
async def health_check():
    return {"status": "ok"}

