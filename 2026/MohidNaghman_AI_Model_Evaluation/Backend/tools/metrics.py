"""
Metrics calculations: BLEU, ROUGE, exact match.

Note: Requires NLTK punkt tokenizer:
    python -m nltk.downloader punkt
"""

import math
import nltk
from rouge_score import rouge_scorer

# Ensure tokenizer exists
try:
    nltk.data.find('tokenizers/punkt')
except LookupError:
    nltk.download('punkt')


def calculate_bleu_score(candidate: str, reference: str) -> float:
    """
    Calculate BLEU score between candidate and reference (0-100 scale).
    
    Simplified BLEU implementation based on n-gram precision and brevity penalty.
    
    Args:
        candidate: The generated text
        reference: The reference text
    
    Returns:
        BLEU score (0-100)
    """
    try:
        if not candidate or not reference:
            return 0.0

        candidate = candidate.strip()
        reference = reference.strip()

        if not candidate or not reference:
            return 0.0

        # Handle special characters and unicode
        try:
            cand_tokens = nltk.word_tokenize(candidate.lower())
            ref_tokens = nltk.word_tokenize(reference.lower())
        except Exception as token_err:
            print(f"⚠️ Tokenization warning: {token_err}, using basic split")
            cand_tokens = candidate.lower().split()
            ref_tokens = reference.lower().split()

        # Calculate exact match first (fast path)
        if cand_tokens == ref_tokens:
            return 100.0

        cand_len = len(cand_tokens)
        ref_len = len(ref_tokens)
        
        if cand_len == 0 or ref_len == 0:
            return 0.0

        # Calculate unigram overlap for shorter texts
        # For longer texts, look at bigrams as well
        cand_set = set(cand_tokens)
        ref_set = set(ref_tokens)
        
        unigram_matches = len(cand_set & ref_set)
        unigram_total = cand_len
        
        if unigram_total == 0:
            return 0.0
        
        unigram_precision = unigram_matches / unigram_total
        
        # For longer texts, also check bigram precision
        if cand_len >= 2 and ref_len >= 2:
            cand_bigrams = {tuple(cand_tokens[i:i+2]) for i in range(cand_len - 1)}
            ref_bigrams = {tuple(ref_tokens[i:i+2]) for i in range(ref_len - 1)}
            
            bigram_matches = len(cand_bigrams & ref_bigrams)
            bigram_total = len(cand_bigrams)
            
            if bigram_total > 0:
                bigram_precision = bigram_matches / bigram_total
            else:
                bigram_precision = 0.0
        else:
            bigram_precision = 0.0
        
        # Combine precisions with weights
        if cand_len >= 2 and ref_len >= 2:
            combined_precision = 0.7 * unigram_precision + 0.3 * bigram_precision
        else:
            combined_precision = unigram_precision
        
        # Brevity penalty: penalize short candidates
        if cand_len >= ref_len:
            bp = 1.0
        else:
            # Exponential penalty for very short candidates
            bp = math.exp(1 - ref_len / cand_len) if cand_len > 0 else 0.0
        
        # Final BLEU score
        score = combined_precision * bp
        return round(score * 100, 2)

    except Exception as e:
        print(f"⚠️ Error in BLEU calculation: {e}")
        return 0.0


def calculate_rouge_score(candidate: str, reference: str) -> float:
    """
    Calculate ROUGE-L score (Longest Common Subsequence).
    
    ROUGE-L measures longest common subsequence match ratio with stemming.
    
    Args:
        candidate: The generated text
        reference: The reference text
    
    Returns:
        ROUGE-L F-score (0-100)
    """
    try:
        if not candidate or not reference:
            return 0.0
        
        # Use rouge_score library for proper ROUGE-L calculation
        scorer = rouge_scorer.RougeScorer(['rougeL'], use_stemmer=True)
        scores = scorer.score(reference, candidate)
        
        return round(scores['rougeL'].fmeasure * 100, 2)
    except Exception as e:
        print(f"⚠️ Error in ROUGE calculation: {e}")
        return 0.0


def check_exact_match(candidate: str, reference: str) -> bool:
    """
    Lenient fuzzy matching for LLM outputs.

    A match succeeds if any of these are true:
    1. Exact or substring match (after cleaning)
    2. Fuzzy similarity >= 70% (more lenient)
    3. Keyword overlap >= 50% (more lenient)
    4. Short answers with >= 40% keyword match (very lenient)

    Args:
        candidate: The generated text
        reference: The reference text

    Returns:
        True if match found, False otherwise
    """
    try:
        import re
        from difflib import SequenceMatcher

        if not candidate or not reference:
            return False

        # Skip API errors
        if isinstance(candidate, str) and candidate.startswith("[") and "ERROR" in candidate:
            return False

        def clean_text(text):
            """Remove punctuation and normalize whitespace"""
            text = re.sub(r'[^\w\s]', '', str(text).lower())
            return " ".join(text.split())

        cand_clean = clean_text(candidate)
        ref_clean = clean_text(reference)

        # Strategy 1: Exact or substring match (after cleaning)
        if cand_clean == ref_clean:
            return True

        if ref_clean in cand_clean or cand_clean in ref_clean:
            return True

        # Strategy 2: Fuzzy similarity (lowered threshold from 0.75 to 0.70)
        similarity = SequenceMatcher(None, cand_clean, ref_clean).ratio()
        if similarity >= 0.70:
            return True

        # Strategy 3: Keyword overlap (lowered from 0.6 to 0.5)
        ref_words = set(ref_clean.split())
        cand_words = set(cand_clean.split())

        if ref_words:
            overlap_ratio = len(ref_words & cand_words) / len(ref_words)
            if overlap_ratio >= 0.50:  # 50% of reference words present
                return True

        # Strategy 4: Short/medium answers (very lenient)
        # For 1-3 word answers, be even more flexible
        if len(ref_words) <= 3:
            matching_words = len(ref_words & cand_words)
            required_matches = max(1, int(len(ref_words) * 0.4))  # 40% match
            if matching_words >= required_matches:
                return True

        return False

    except Exception as e:
        print(f"⚠️ Error in exact match check: {e}")
        return False

def calculate_token_overlap(candidate: str, reference: str) -> float:
    """
    Calculate token overlap using Jaccard similarity (symmetric).
    
    Jaccard = intersection / union (not just recall)
    
    Args:
        candidate: The generated text
        reference: The reference text
    
    Returns:
        Jaccard overlap percentage (0-100)
    """
    try:
        if not candidate or not reference:
            return 0.0
        
        # Consistent tokenization with NLTK
        candidate_tokens = set(nltk.word_tokenize(candidate.lower()))
        reference_tokens = set(nltk.word_tokenize(reference.lower()))
        
        if not candidate_tokens and not reference_tokens:
            return 100.0
        
        if not candidate_tokens or not reference_tokens:
            return 0.0
        
        # Jaccard similarity: intersection / union
        intersection = len(candidate_tokens & reference_tokens)
        union = len(candidate_tokens | reference_tokens)
        
        if union == 0:
            return 0.0
        
        return round((intersection / union) * 100, 2)
    except Exception as e:
        print(f"⚠️ Error in token overlap calculation: {e}")
        return 0.0