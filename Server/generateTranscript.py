import sys
from urllib.parse import urlparse, parse_qs

from youtube_transcript_api import YouTubeTranscriptApi


def extract_video_id(url_or_id: str) -> str:
    """
    Very small helper:
    - If a full YouTube URL is passed, pull out the video id from the "v" param
    - Otherwise just return the value as-is (treat it as an id)
    """
    if "youtube.com" in url_or_id or "youtu.be" in url_or_id:
        parsed = urlparse(url_or_id)

        # Short URL: https://youtu.be/VIDEO_ID
        if parsed.hostname == "youtu.be":
            return parsed.path.lstrip("/")

        # Standard watch URL: https://www.youtube.com/watch?v=VIDEO_ID
        query = parse_qs(parsed.query)
        return query.get("v", [url_or_id])[0]

    return url_or_id


if __name__ == "__main__":
    # Expect: python generateTranscript.py "<youtube_url_or_video_id>"
    if len(sys.argv) < 2:
        print("Please provide a YouTube URL or video ID.")
        sys.exit(1)

    url_or_id = sys.argv[1]
    video_id = extract_video_id(url_or_id)

    api = YouTubeTranscriptApi()
    fetched = api.fetch(video_id, languages=["en"])
    data = fetched.to_raw_data()

    # Join all text segments into one string and print it
    full_text = " ".join([item["text"] for item in data])
    print(full_text)
    


