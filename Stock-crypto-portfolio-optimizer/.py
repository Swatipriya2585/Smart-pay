import os
from autogen_agentchat.agents import AssistantAgent
from autogen_agentchat.conditions import TextMentionTermination
from autogen_agentchat.teams import RoundRobinGroupChat
from autogen_agentchat.ui import Console
from autogen_core.tools import FunctionTool
from autogen_ext.models.openai import OpenAIChatCompletionClient
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Get API key from environment variables
api_key = os.getenv("OPENAI_API_KEY")

if not api_key or api_key == "your_openai_api_key_here":
    print("⚠️  Warning: Please set your OpenAI API key in the .env file")
    print("   Replace 'your_openai_api_key_here' with your actual API key")
    exit(1)

client = OpenAIChatCompletionClient(
    model="gpt-4o-mini",
    api_key=api_key,
)

assistant = AssistantAgent(client, name="Assistant")
print("✅ OpenAI API client configured successfully!")