import requests
from dotenv import load_dotenv
from pydantic import BaseModel, Field
from enum import Enum
import random # Added for the new tool

load_dotenv()

from langchain.tools import tool
from langchain_core.utils.function_calling import convert_to_openai_function
from langchain_openai import ChatOpenAI
from langchain.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain.agents.output_parsers import OpenAIFunctionsAgentOutputParser
from langchain.agents.format_scratchpad import format_to_openai_functions
from langchain.schema.agent import AgentFinish
from langchain.schema.runnable import RunnablePassthrough
from langchain.agents import AgentExecutor
from langchain.memory import ConversationBufferMemory

# --- Pydantic Schemas for Tools ---
class NicheResearchInput(BaseModel):
    niche_query: str = Field(..., description="The user's query or topic for niche research on Merch by Amazon.")

class IPCheckInput(BaseModel):
    text_to_check: str = Field(..., description="A keyword, phrase, or brand name to perform a basic IP check on.")

# --- Tool Definitions ---

# Example mock data structure for research_mba_niche
mock_keywords_pool = [
    "cat lover gifts", "nurse humor apparel", "vet tech shirts", "funny feline designs", 
    "healthcare worker tees", "dog enthusiast clothing", "programmer jokes", "coffee addict merch",
    "retro gaming shirts", "vintage car designs", "fishing hobby apparel", "gardening lover gifts"
]
mock_sub_niches_pool = [
    "funny black cat shirts for ER nurses", "vintage style cat shirts for pediatric nurses",
    "golden retriever dad hats", "python coder hoodies", "espresso yourself mugs",
    "8-bit gamer t-shirts", "classic muscle car art prints", "bass fishing tournament jerseys",
    "organic vegetable gardening aprons"
]
mock_competition_scores = ["Low", "Medium", "High", "Very High"]

@tool(args_schema=NicheResearchInput)
def research_mba_niche(niche_query: str):
    '''Researches a potential Merch by Amazon niche based on a query. 
       Provides initial keywords, sub-niche ideas, and a mock competition score.
       Note: This is an initial version with mock data.'''
    
    selected_keywords = random.sample(mock_keywords_pool, k=min(len(mock_keywords_pool), random.randint(3,5)))
    selected_sub_niches = random.sample(mock_sub_niches_pool, k=min(len(mock_sub_niches_pool), random.randint(1,2)))
    
    return {
        "niche_query": niche_query,
        "status": "Mock data - Initial analysis. Further detailed research is recommended.",
        "potential_keywords": selected_keywords,
        "suggested_sub_niches": selected_sub_niches,
        "mock_competition_score": random.choice(mock_competition_scores),
        "notes": "This data is for demonstration purposes. Real niche research requires analyzing actual market data, sales trends, and keyword volumes from Amazon and other research tools."
    }

# Predefined list for the simple IP check tool
PREDEFINED_RISKY_TERMS = [
    "mickey mouse", "star wars", "marvel", "disney", "nike", "just do it", 
    "harry potter", "amazon", "google", "coca-cola", "lego", "starbucks",
    "apple", "windows", "jeep", "nasa" # Added a few more examples
]

@tool(args_schema=IPCheckInput)
def check_trademark_simple(text_to_check: str):
    '''Performs a very basic check against a predefined list of potentially problematic terms.
       This is not a substitute for thorough trademark research.
    '''
    text_lower = text_to_check.lower()
    found_risky_terms = []
    status = "Basic check - No obvious issues found from predefined list."
    
    for risky_term in PREDEFINED_RISKY_TERMS:
        if risky_term in text_lower: # Simple substring check
            found_risky_terms.append(risky_term)
    
    if found_risky_terms:
        status = "Potential issue - The following term(s) from a predefined list were found: " + ", ".join(found_risky_terms) + ". These are often protected."

    return {
        "text_checked": text_to_check,
        "status": status,
        "matched_predefined_terms": found_risky_terms,
        "recommendation": "This is a rudimentary check against a small, predefined list of high-profile terms only. It is NOT a comprehensive trademark search. ALWAYS conduct thorough research using official trademark databases (e.g., USPTO TESS, WIPO) and consult with a legal professional before using any brand name, phrase, or design element commercially on Merch by Amazon or any other platform."
    }

# Updated tools list
tools = [research_mba_niche, check_trademark_simple]

# LLM and prompt setup
functions = [convert_to_openai_function(f) for f in tools]
model = ChatOpenAI(model="gpt-4o")
if functions:  # Ensure model is bound only if there are functions
    model = model.bind(functions=functions)

prompt = ChatPromptTemplate.from_messages([
    ("system", """You are the 'Print on Demand GOD,' a strategic AI agent specializing in the Merch by Amazon (MbA) ecosystem. Your purpose is to guide developers and creators by identifying straightforward and effective development solutions for next-generation MbA tools. You have comprehensive knowledge of:

    *   **MbA Core Mechanics:** Tier levels, royalty calculations, content policies (copyright, trademarks), design specifications (PNG, 300dpi, dimensions), product ranges, and listing lifecycles (draft, under review, processing, live, removed).
    *   **Creator Challenges & Solutions:** You understand the hurdles MbA creators face, including fierce competition in niche research, time-consuming design processes, stringent IP and content policy adherence, listing optimization for visibility, and the complexities of managing a design portfolio under tier limits and content removal policies. You can propose simple development approaches (web apps, browser extensions, mobile tools) to address these.
    *   **Niche Identification & Validation:** Strategies for finding untapped or micro-niches, understanding market saturation, and analyzing trends.
    *   **Image Generation & Editing:** Ideas for tools that simplify creating compliant and attractive designs, including background removal, resizing, DPI checks, and variant generation.
    *   **Automation Opportunities:** Automating repetitive tasks in the MbA workflow, such as listing data formatting or basic IP pre-checks, while being mindful of MbA's terms of service.
    *   **Existing Tool Landscape:** You are aware of tools like MerchDominator, MerchInformer, FlyingUpload, and their strengths/weaknesses, enabling you to suggest innovative and simpler alternatives.

    You will assist users by breaking down complex MbA problems and suggesting practical, developer-friendly solutions and tool concepts. When appropriate, you will indicate how you can use your specialized (future) tools to provide information or analysis. Your advice should be strategic, clear, and actionable."""),
    MessagesPlaceholder(variable_name="chat_history"),
    ("user", "{input}"),
    MessagesPlaceholder(variable_name="agent_scratchpad")
])

# Agent chain setup
agent_chain = RunnablePassthrough.assign(
    agent_scratchpad=lambda x: format_to_openai_functions(x["intermediate_steps"])
) | prompt | model | OpenAIFunctionsAgentOutputParser()

# Updated known_actions dictionary
known_actions = {
    "research_mba_niche": research_mba_niche,
    "check_trademark_simple": check_trademark_simple,
}

# AgentExecutor setup
memory = ConversationBufferMemory(return_messages=True, memory_key="chat_history")
agent_executor = AgentExecutor(agent=agent_chain, tools=tools, verbose=True, memory=memory)

# Example of how to run the agent
if __name__ == '__main__':
    print(f"MBA Agent initialized with Tools: {[tool.name for tool in agent_executor.tools]}")
    
    # Example showing it can still chat
    # try:
    #     response = agent_executor.invoke({"input": "Hello, tell me a joke."})
    #     print("\nAgent Response (chat):")
    #     print(response["output"])
    # except Exception as e:
    #     print(f"Error invoking agent for chat: {e}")

    # Example invoking the niche research tool
    print("\nAttempting to use the 'research_mba_niche' tool...")
    try:
        niche_query_test = "vintage car enthusiast apparel"
        response_niche_tool = agent_executor.invoke({
            "input": f"Research the niche: {niche_query_test}" 
        })
        print("\nAgent Response (Niche Research Tool):")
        print(response_niche_tool["output"])
    except Exception as e:
        print(f"Error invoking Niche Research tool: {e}")

    # Example invoking the IP check tool (safe text)
    print("\nAttempting to use the 'check_trademark_simple' tool (safe text)...")
    try:
        safe_text_check = "my unique creative design"
        response_ip_safe = agent_executor.invoke({
            "input": f"Check IP for phrase: {safe_text_check}"
        })
        print("\nAgent Response (IP Check - Safe):")
        print(response_ip_safe["output"])
    except Exception as e:
        print(f"Error invoking IP Check tool (safe): {e}")

    # Example invoking the IP check tool (risky text)
    print("\nAttempting to use the 'check_trademark_simple' tool (risky text)...")
    try:
        risky_text_check = "official disney pixar cars shirt" # Contains 'disney'
        response_ip_risky = agent_executor.invoke({
            "input": f"Check IP for phrase: {risky_text_check}"
        })
        print("\nAgent Response (IP Check - Risky):")
        print(response_ip_risky["output"])
    except Exception as e:
        print(f"Error invoking IP Check tool (risky): {e}")

    # Direct tool call for verification (outside agent loop)
    # print("\nDirect tool call verification (IP Check):")
    # direct_tool_output_ip = check_trademark_simple(IPCheckInput(text_to_check="mickey mouse t-shirt"))
    # print(direct_tool_output_ip)
