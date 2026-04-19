import streamlit as st
import threading
import os
import logging
from dotenv import load_dotenv
from streamlit_autorefresh import st_autorefresh
from utils import Realtime

logging.basicConfig(
    level=logging.INFO, format="%(asctime)s [%(levelname)s] %(message)s"
)
load_dotenv()

st_autorefresh(interval=1000, key="file_refresh")


# Read content from file to display, this file is written by agent thread that runs in the background
# This is just a workaround for building a POC and not prefered way in production because of the way streamlit works
def read_file():
    with open("html_display_code.txt", "r") as f:
        content = f.read().strip()
    return content if content else "<p></p>"


# Streamlit UI
st.markdown(
    "<h1 style='text-align: center;'>Voice Agent That Draws</h1>",
    unsafe_allow_html=True,
)


if "realtime_instance" not in st.session_state:
    st.session_state.realtime_instance = None

col1, col2, _ = st.sidebar.columns([1, 1, 1])

with col1:
    # Start running the agent thread
    if st.button("Start Agent"):
        api_key = os.getenv("OPENAI_API_KEY")
        ws_url = (
            "wss://api.openai.com/v1/realtime?model=gpt-realtime-2025-08-28"
        )

        st.session_state.realtime_instance = Realtime(api_key, ws_url)
        thread = threading.Thread(
            target=st.session_state.realtime_instance.start, daemon=True
        )
        thread.start()

with col2:
    # Stop the agent thread
    if st.button("Stop Agent"):
        if st.session_state.realtime_instance:
            st.session_state.realtime_instance.stop()
        st.stop()

st.sidebar.text_area("HTML", read_file(), height=350)

# Main UI for rendered output
st.html(read_file())
