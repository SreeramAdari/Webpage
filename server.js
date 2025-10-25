from fastapi import FastAPI, HTTPException
from sqlalchemy import create_engine, MetaData, Table, Column, Integer, String, select
from sqlalchemy.orm import sessionmaker
from pydantic import BaseModel
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL:
    raise RuntimeError("DATABASE_URL missing in .env (e.g. mysql+pymysql://user:pass@host:3306/dbname)")

# Create SQLAlchemy engine
engine = create_engine(DATABASE_URL)
metadata = MetaData()

# Define a sample table
users = Table(
    "users",
    metadata,
    Column("id", Integer, primary_key=True, autoincrement=True),
    Column("name", String(50)),
    Column("email", String(100), unique=True),
)

# Create all tables
metadata.create_all(engine)

# Create a session
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# FastAPI app
app = FastAPI()

# Pydantic model
class User(BaseModel):
    name: str
    email: str

@app.get("/")
def read_root():
    return {"message": "MySQL (SQLAlchemy + PyMySQL) backend is running successfully!"}

@app.post("/users")
def create_user(user: User):
    session = SessionLocal()
    try:
        stmt = users.insert().values(name=user.name, email=user.email)
        session.execute(stmt)
        session.commit()
        return {"message": "User added successfully!"}
    except Exception as e:
        session.rollback()
        raise HTTPException(status_code=400, detail=str(e))
    finally:
        session.close()

@app.get("/users")
def get_users():
    session = SessionLocal()
    try:
        stmt = select(users)
        result = session.execute(stmt).fetchall()
        return [{"id": row.id, "name": row.name, "email": row.email} for row in result]
    finally:
        session.close()
