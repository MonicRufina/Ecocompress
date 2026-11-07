# decision.py

def select_best_algorithm(results: list, optimization_objective: str = "Balanced", custom_weights: dict = None, carbon_budget: float = None):
    """
    Adaptive Decision Engine:
    Scores algorithms based on weights derived from the user's optimization objective
    or custom weighted sliders.
    Returns:
    - selected_algorithm (str)
    - reason (str)
    - budget_exceeded (bool)
    - level (int)
    """
    if not results:
        return "DEFLATE", "No algorithms to evaluate.", False, 6
        
    # Presets
    weights_presets = {
        "Minimum File Size": {"size": 0.75, "time": 0.05, "energy": 0.05, "carbon": 0.15},
        "Minimum Energy":    {"size": 0.10, "time": 0.20, "energy": 0.55, "carbon": 0.15},
        "Minimum Carbon":    {"size": 0.10, "time": 0.10, "energy": 0.20, "carbon": 0.60},
        "Eco":               {"size": 0.15, "time": 0.10, "energy": 0.25, "carbon": 0.50},
        "Speed":             {"size": 0.10, "time": 0.60, "energy": 0.20, "carbon": 0.10},
        "Balanced":          {"size": 0.30, "time": 0.20, "energy": 0.25, "carbon": 0.25},
    }
    
    if custom_weights and isinstance(custom_weights, dict) and sum(custom_weights.values()) > 0:
        total = sum(custom_weights.values())
        selected_weights = {k: v / total for k, v in custom_weights.items()}
    else:
        selected_weights = weights_presets.get(optimization_objective, weights_presets["Balanced"])
    
    valid_results = [r for r in results if not r.get("skipped")]
    if not valid_results:
        return results[0]["algorithm"], "Default fallback selected.", False, 6
        
    max_size = max(r["compressed_size"] for r in valid_results)
    min_size = min(r["compressed_size"] for r in valid_results)
    
    max_time = max(r["compression_time"] for r in valid_results)
    min_time = min(r["compression_time"] for r in valid_results)
    
    max_energy = max(r["energy"] for r in valid_results)
    min_energy = min(r["energy"] for r in valid_results)
    
    max_carbon = max(r["carbon"] for r in valid_results)
    min_carbon = min(r["carbon"] for r in valid_results)
    
    best_score = -9999.0
    best_algorithm = None
    best_item = None
    
    for r in valid_results:
        def normalize_inv(val, max_val, min_val):
            if max_val == min_val:
                return 1.0
            return 1.0 - ((val - min_val) / (max_val - min_val))
            
        score_size = normalize_inv(r["compressed_size"], max_size, min_size)
        score_time = normalize_inv(r["compression_time"], max_time, min_time)
        score_energy = normalize_inv(r["energy"], max_energy, min_energy)
        score_carbon = normalize_inv(r["carbon"], max_carbon, min_carbon)
        
        final_score = (
            selected_weights.get("size", 0.25) * score_size +
            selected_weights.get("time", 0.25) * score_time +
            selected_weights.get("energy", 0.25) * score_energy +
            selected_weights.get("carbon", 0.25) * score_carbon
        )
        
        r["score"] = round(final_score, 4)
        
        if final_score > best_score:
            best_score = final_score
            best_algorithm = r["algorithm"]
            best_item = r
            
    if best_algorithm is None:
        best_algorithm = valid_results[0]["algorithm"]
        best_item = valid_results[0]
        
    # Check carbon budget
    budget_exceeded = False
    if carbon_budget and carbon_budget > 0 and best_item and best_item.get("carbon", 0) > carbon_budget:
        budget_exceeded = True
        
    # Codec level estimation
    levels = {
        "Eco-RLE": 1,
        "Huffman": 1,
        "LZW": 2,
        "LZ77": 3,
        "Delta-LZ": 4,
        "Eco-LZH": 4,
        "DEFLATE": 6,
        "BZip2": 7,
        "LZMA": 9,
        "Eco-PDF": 4,
        "Flate-PDF": 6,
        "Fast-PDF": 1,
        "Deep-PDF": 9,
        "Fast-Video": 1,
        "Eco-Video": 4,
        "Balanced-Video": 6,
        "Deep-Video": 9,
        "Fast-Image": 1,
        "Eco-Image": 4,
        "Balanced-Image": 6,
        "Deep-Image": 9,
        "Fast-Docx": 1,
        "Eco-Docx": 4,
        "Balanced-Docx": 6,
        "Deep-Docx": 9
    }
    chosen_level = levels.get(best_algorithm, 6)
    
    reasons = {
        "Eco": f"Eco-Optimization selected {best_algorithm} (Level {chosen_level}) to minimize computational carbon emissions under the prevailing grid carbon intensity.",
        "Minimum Carbon": f"Selected {best_algorithm} (Level {chosen_level}) as it yields the lowest carbon emissions profile given current grid factors.",
        "Speed": f"Selected {best_algorithm} (Level {chosen_level}) for rapid single-pass compression with minimal CPU latency.",
        "Minimum File Size": f"Selected {best_algorithm} (Level {chosen_level}) to achieve maximal storage space reduction.",
        "Minimum Energy": f"Selected {best_algorithm} (Level {chosen_level}) to minimize total watt-seconds expended by the system.",
        "Balanced": f"Selected {best_algorithm} (Level {chosen_level}) providing an optimal multi-objective balance between ratio, runtime, and carbon efficiency."
    }
    
    reason = reasons.get(optimization_objective, reasons["Balanced"])
    if budget_exceeded:
        reason += f" ⚠️ Note: Emitted {best_item.get('carbon')} gCO₂ exceeds the configured job budget of {carbon_budget} gCO₂."
        
    return best_algorithm, reason, budget_exceeded, chosen_level
