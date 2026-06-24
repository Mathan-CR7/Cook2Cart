import sys
from flask import Flask, request, jsonify
from youtube_transcript_api import YouTubeTranscriptApi
from youtube_transcript_api._errors import TranscriptsDisabled, NoTranscriptFound, VideoUnavailable

app = Flask(__name__)

@app.route('/', methods=['GET'])
def index():
    return jsonify({
        "service": "Cook2Cart Python Transcript Service",
        "endpoints": {
            "/health": "GET - Check service health status",
            "/transcript?video_id=<id>": "GET - Fetch transcript text for a YouTube video"
        }
    }), 200

@app.route('/health', methods=['GET'])
def health():
    return jsonify({"status": "UP"}), 200

@app.route('/transcript', methods=['GET'])
def get_transcript():
    video_id = request.args.get('video_id')
    if not video_id:
        return jsonify({"error": "video_id parameter is required"}), 400
    
    try:
        # Check and get the transcript list
        if hasattr(YouTubeTranscriptApi, 'list_transcripts'):
            transcript_list = YouTubeTranscriptApi.list_transcripts(video_id)
        else:
            transcript_list = YouTubeTranscriptApi().list(video_id)
        
        # Try to find english or auto-generated english transcript, or fallback to any available
        try:
            transcript = transcript_list.find_transcript(['en'])
        except Exception:
            # Fallback to the first available transcript
            try:
                transcript = next(iter(transcript_list))
            except StopIteration:
                return jsonify({"error": "No transcripts found for this video"}), 404
        
        # Fetch actual transcript data
        data = transcript.fetch()
        full_text = " ".join([(entry.text if hasattr(entry, 'text') else entry['text']) for entry in data])
        
        return jsonify({
            "video_id": video_id,
            "language": transcript.language,
            "language_code": transcript.language_code,
            "is_generated": transcript.is_generated,
            "transcript": full_text
        }), 200

    except (TranscriptsDisabled, NoTranscriptFound, VideoUnavailable) as e:
        return jsonify({"error": str(e), "available": False}), 404
    except Exception as e:
        return jsonify({"error": f"An error occurred: {str(e)}", "available": False}), 500

if __name__ == '__main__':
    port = 8089
    if len(sys.argv) > 1:
        try:
            port = int(sys.argv[1])
        except ValueError:
            pass
    app.run(host='0.0.0.0', port=port)
