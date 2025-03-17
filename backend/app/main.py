from fastapi import FastAPI
from backend.helpers.LoggingHelper import LoggingHelper

LoggingHelper.initialize()

app = FastAPI()


@app.get("/")
async def read_root():
    return {"message": "Welcome Astronomer to the SolarSpotting Backend!"}


@app.get("/health")
async def health_check():
    return {"status": "ok"}


def main():
    LoggingHelper.info("info test 2", module="main")
    LoggingHelper.debug("debug test 2", module="main")
    LoggingHelper.warning("warning test 2", module="main")
    LoggingHelper.error("error test 2", module="main")
    LoggingHelper.critical("critical test 2", module="main")
    try:
        # Some code that might raise an exception
        result = 1 / 0
    except Exception as e:
        # Use exception() within the except block
        LoggingHelper.exception(f"Division error: {str(e)}", module="main")
    LoggingHelper.log_request("POST", "solarspotting.app", 404, 3.3)


if __name__ == "__main__":
    main()
