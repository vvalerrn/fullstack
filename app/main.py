from fastapi import FastAPI
from .routers import meetings, tasks, users, auth, ai
from .database import Base, engine
from .middleware import LogMiddleware
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Meeting Protocol API")

Base.metadata.create_all(bind=engine)

@app.get("/")
def root():
    return {"message": "Server is running"}


app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(meetings.router)
app.include_router(tasks.router)
app.include_router(users.router)
app.include_router(auth.router)
app.include_router(ai.router)

app.add_middleware(LogMiddleware)