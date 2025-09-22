#!/usr/bin/env python3
"""
Create a .cube LUT file from a 64 color palette.
Maps any RGB color to the nearest color in the palette.
"""

import numpy as np

# Define your 64 color palette here
# This is an example - replace with your actual palette
# Format: List of (R, G, B) tuples where values are 0-255


COLOR_BLACK 		= (0, 0, 0)
COLOR_WHITE 		= (255, 255, 255)
COLOR_RED 			= (104, 55, 43)
COLOR_CYAN 			= (112, 164, 178)
COLOR_PURPLE 		= (111, 61, 134)
COLOR_GREEN 		= (88, 141, 67)
COLOR_BLUE 			= (53, 40, 121)
COLOR_YELLOW 		= (184, 199, 111)
COLOR_ORANGE 		= (111, 79, 37)
COLOR_BROWN 		= (67, 57, 0)
COLOR_LIGHTRED 		= (154, 103, 89)
COLOR_DARKGREY 		= (68, 68, 68)
COLOR_GREY 			= (108, 108, 108)
COLOR_LIGHTGREEN 	= (154, 210, 132)
COLOR_LIGHTBLUE 	= (108, 94, 181)
COLOR_LIGHTGREY 	= (149, 149, 149)

PALETTE_64 = [
    COLOR_BLACK,
    COLOR_WHITE,
    COLOR_RED,
    COLOR_CYAN,
    COLOR_PURPLE,
    COLOR_GREEN,
    COLOR_BLUE,
    COLOR_YELLOW,
    COLOR_ORANGE,
    COLOR_BROWN,
    COLOR_LIGHTRED,
    COLOR_DARKGREY,
    COLOR_GREY,
    COLOR_LIGHTGREEN,
    COLOR_LIGHTBLUE,
    COLOR_LIGHTGREY
]

# Generate a sample 64-color palette if not fully defined
# (Remove this and use your actual palette)
if len(PALETTE_64) < 64:
    # Generate a 4x4x4 color cube for demonstration
    for r in range(4):
        for g in range(4):
            for b in range(4):
                if len(PALETTE_64) < 64:
                    PALETTE_64.append((r * 85, g * 85, b * 85))

def find_nearest_color(color, palette):
    """Find the nearest color in the palette using Euclidean distance."""
    min_distance = float('inf')
    nearest = palette[0]
    
    for palette_color in palette:
        # Calculate Euclidean distance in RGB space
        distance = sum((c1 - c2) ** 2 for c1, c2 in zip(color, palette_color)) ** 0.5
        
        if distance < min_distance:
            min_distance = distance
            nearest = palette_color
    
    return nearest

def create_cube_lut(palette, lut_size=64, filename="palette_64.cube"):
    """
    Create a .cube LUT file from a color palette.
    
    Args:
        palette: List of (R, G, B) tuples (0-255 range)
        lut_size: Size of the LUT (typically 16, 32, or 64)
        filename: Output filename
    """
    
    # Normalize palette to 0-1 range
    normalized_palette = [(r/255.0, g/255.0, b/255.0) for r, g, b in palette]
    
    with open(filename, 'w') as f:
        # Write header
        f.write("# Created by 64-color palette LUT generator\n")
        f.write(f"# Palette contains {len(palette)} colors\n")
        f.write(f"LUT_3D_SIZE {lut_size}\n")
        f.write("\n")
        
        # Generate LUT entries
        # For a 3D LUT, we need to sample the entire RGB cube
        for b in range(lut_size):
            for g in range(lut_size):
                for r in range(lut_size):
                    # Convert indices to RGB values (0-255)
                    if lut_size > 1:
                        input_r = r * 255 / (lut_size - 1)
                        input_g = g * 255 / (lut_size - 1)
                        input_b = b * 255 / (lut_size - 1)
                    else:
                        input_r = input_g = input_b = 0
                    
                    # Find nearest color in palette
                    nearest = find_nearest_color((input_r, input_g, input_b), palette)
                    
                    # Write normalized values (0-1 range)
                    f.write(f"{nearest[0]/255:.6f} {nearest[1]/255:.6f} {nearest[2]/255:.6f}\n")
    
    print(f"Created {filename} with {lut_size}x{lut_size}x{lut_size} = {lut_size**3} entries")
    print(f"Mapped to {len(palette)} colors")

def create_simple_cube_lut(palette, filename="palette_64_simple.cube"):
    """
    Create a simpler identity-based .cube file that just lists the palette colors.
    This is useful for some applications that expect a simpler format.
    """
    with open(filename, 'w') as f:
        f.write("# 64-color palette LUT\n")
        f.write("LUT_3D_SIZE 4\n")  # 4x4x4 = 64 colors
        f.write("\n")
        
        # Just output the palette colors in order
        for r, g, b in palette[:64]:  # Ensure we only use first 64 colors
            f.write(f"{r/255:.6f} {g/255:.6f} {b/255:.6f}\n")
    
    print(f"Created simple {filename} with {len(palette[:64])} colors")

if __name__ == "__main__":
    # Validate palette
    if len(PALETTE_64) != 64:
        print(f"Warning: Palette has {len(PALETTE_64)} colors, expected 64")
    
    # Create the LUT files
    create_cube_lut(PALETTE_64, lut_size=32, filename="palette_64.cube")
    create_simple_cube_lut(PALETTE_64, filename="palette_64_simple.cube")
    
    print("\nUsage in video editing software:")
    print("- Import palette_64.cube as a 3D LUT")
    print("- This will quantize any video/image to your 64-color palette")