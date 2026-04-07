"""Slug generation utility."""

from slugify import slugify


def generate_slug(text: str) -> str:
    """Convert arbitrary text into a URL-safe slug.

    Uses ``python-slugify`` under the hood.

    Args:
        text: The input string to slugify.

    Returns:
        A lowercase, hyphen-separated slug string.

    Examples:
        >>> generate_slug("Hello World!")
        'hello-world'
        >>> generate_slug("  Spicy Chicken Adobo 🌶️  ")
        'spicy-chicken-adobo'
    """
    return slugify(text)
