# energy.py

def estimate_power_watts(cpu_usage: float) -> float:
    """
    Estimated system power draw in Watts during compression.
    Base idle power + scaled CPU wattage factor.
    """
    BASE_POWER = 20.0  # W baseline system draw
    CPU_POWER_FACTOR = 0.5  # W per 1% CPU utilization
    return BASE_POWER + (max(0.0, cpu_usage) * CPU_POWER_FACTOR)

def estimate_energy_joules(compression_time: float, cpu_usage: float) -> float:
    """
    Energy in Joules = Power (Watts) * Time (Seconds)
    1 Watt * 1 Second = 1 Joule
    """
    power_watts = estimate_power_watts(cpu_usage)
    energy_joules = power_watts * max(0.001, compression_time)
    return round(energy_joules, 4)

def estimate_energy(compression_time: float, cpu_usage: float) -> float:
    """
    Energy in Watt-hours (Wh) = Joules / 3600
    """
    energy_joules = estimate_energy_joules(compression_time, cpu_usage)
    energy_wh = energy_joules / 3600.0
    return round(energy_wh, 6)

def estimate_carbon_emission(energy_wh: float, carbon_intensity: float) -> float:
    """
    Carbon Emission in grams of CO2 = Energy (kWh) * Carbon Intensity (g CO2/kWh)
    """
    energy_kwh = energy_wh / 1000.0
    estimated_carbon_g = energy_kwh * max(1.0, carbon_intensity)
    return round(estimated_carbon_g, 6)

def get_carbon_equivalents(carbon_g: float) -> dict:
    """
    Convert saved or emitted gCO2 into real-world tangible human metrics:
    - Smartphone battery charges (approx 8.22 gCO2 per full charge)
    - Electric Vehicle km driven (approx 95 gCO2 / km)
    - LED Lightbulb hours (approx 2.5 gCO2 per hour of 9W LED on 400g grid)
    - Tree seedling sequestration days (approx 60 gCO2 per tree-day)
    """
    c = max(0.0, carbon_g)
    return {
        "phone_charges": round(c / 8.22, 2),
        "ev_km": round(c / 95.0, 3),
        "led_hours": round(c / 2.5, 1),
        "tree_days": round(c / 60.0, 3),
        "grams_co2": round(c, 4),
        "kg_co2": round(c / 1000.0, 6)
    }
