from fastapi import APIRouter,HTTPException,Request
from app.services import Problem,Thought,Attempt,Strategies,Tutor,IdentifyDisability
openai_router=APIRouter()

# @openai_router.get("/generate_conversation")
# async def generateConversation(disability:str):
#     try:
#         response=await Conversation(disability)
#         return response
#     except Exception as e:
#         raise HTTPException(status_code=500,details=str(e))

@openai_router.get("/generate_problem")
async def generateProblem(grade_level: str = "7th", difficulty: str = "medium"):
    try:
        response=await Problem(grade_level, difficulty)
        return response
    except Exception as e:
        raise HTTPException(status_code=500,details=str(e))

@openai_router.post("/generate_thought")
async def generateThought(request:Request):
    try:
        data=await request.json()
        disability=data.get("disability")
        problem=data.get("problem")
        if not disability or not problem:
            raise HTTPException(status_code=400,detail="disability and problem are required")
        response=await Thought(disability,problem)
        return response
    except Exception as e:
        raise HTTPException(status_code=500,details=str(e))

@openai_router.post("/generate_strategies")
async def generateThought(request:Request):
    try:
        data=await request.json()
        disability=data.get("disability")
        problem=data.get("problem")
        if not disability or not problem:
            raise HTTPException(status_code=400,detail="disability and problem are required")
        response=await Strategies(disability,problem)
        return response
    except Exception as e:
        raise HTTPException(status_code=500,details=str(e))
    
@openai_router.post("/generate_attempt")
async def generateThought(request:Request):
    try:
        data=await request.json()
        disability=data.get("disability")
        problem=data.get("problem")
        if not disability or not problem:
            raise HTTPException(status_code=400,detail="disability and problem are required")
        response=await Attempt(disability,problem)
        return response
    except Exception as e:
        raise HTTPException(status_code=500,details=str(e))

@openai_router.post("/generate_tutor")
async def generateTutor(request:Request):
    try:
        data=await request.json()
        disability=data.get("disability")
        problem=data.get("problem")
        if not disability or not problem:
            raise HTTPException(status_code=400,detail="disability and problem are required")
        response=await Tutor(disability,problem)
        return response
    except Exception as e:
        raise HTTPException(status_code=500,details=str(e))

@openai_router.post("/identify_disability")
async def identifyDisability(request:Request):
    try:
        data=await request.json()
        problem=data.get("problem")
        student_response=data.get("student_response")
        if not problem or not student_response:
            raise HTTPException(status_code=400,detail="problem and student_response are required")
        response=await IdentifyDisability(problem,student_response)
        return response
    except Exception as e:
        raise HTTPException(status_code=500,details=str(e))

