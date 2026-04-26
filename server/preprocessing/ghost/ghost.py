import os
import sys
import requests


def main():
    if len(sys.argv) < 3:
        raise ValueError("Usage: python ghost.py <input_image_path> <output_image_path>")

    input_path = sys.argv[1]
    output_path = sys.argv[2]
    api_key = os.getenv("PHOTOROOM_API_KEY")

    if not api_key:
        raise ValueError("Missing PHOTOROOM_API_KEY environment variable")

    if not os.path.exists(input_path):
        raise FileNotFoundError(f"Input image not found: {input_path}")

    os.makedirs(os.path.dirname(output_path), exist_ok=True)
    print(f"Processing garment image: {input_path}")

    with open(input_path, "rb") as f:
        response = requests.post(
            "https://image-api.photoroom.com/v2/edit",
            headers={"x-api-key": api_key},
            files={"imageFile": f},
            data={
                "ghostMannequin.mode": "ai.auto",
                "background.color": "ffffff",
                "padding": "0.1",
            },
            timeout=120,
        )

    if response.status_code != 200:
        raise RuntimeError(f"Photoroom error {response.status_code}: {response.text}")

    with open(output_path, "wb") as out_file:
        out_file.write(response.content)

    print(f"Saved processed output: {output_path}")


if __name__ == "__main__":
    try:
        main()
    except Exception as err:
        print(str(err), file=sys.stderr)
        sys.exit(1)