#!/usr/bin/env python3
"""
Bezier City CLI Tool
A simple REPL for interacting with the Bezier City backend.

Usage:
    street N    - Get ASCII representation of street N
    quit/exit   - Exit the REPL
    help        - Show this help
"""

import requests
import sys
import re

class BezierCityCLI:
    def __init__(self, api_base="http://localhost:8000"):
        self.api_base = api_base
        
    def get_street_ascii(self, street_id: int):
        """Get ASCII representation of a street"""
        try:
            response = requests.get(f"{self.api_base}/street/{street_id}/ascii")
            if response.status_code == 200:
                data = response.json()
                return data.get("ascii", "No ASCII data found")
            elif response.status_code == 404:
                return f"Street {street_id} not found"
            else:
                return f"Error: {response.status_code} - {response.text}"
        except requests.exceptions.ConnectionError:
            return "Error: Could not connect to backend server. Is it running on localhost:8000?"
        except Exception as e:
            return f"Error: {e}"
    
    def show_help(self):
        """Show available commands"""
        print(__doc__)
    
    def run(self):
        """Run the REPL"""
        print("Bezier City CLI")
        print("Type 'help' for available commands, 'quit' or 'exit' to exit")
        print()
        
        while True:
            try:
                user_input = input("bezier-city> ").strip()
                
                if not user_input:
                    continue
                    
                if user_input.lower() in ['quit', 'exit']:
                    print("Goodbye!")
                    break
                    
                if user_input.lower() == 'help':
                    self.show_help()
                    continue
                
                # Match "street N" command
                street_match = re.match(r'^street\s+(\d+)$', user_input, re.IGNORECASE)
                if street_match:
                    street_id = int(street_match.group(1))
                    result = self.get_street_ascii(street_id)
                    print(result)
                    continue
                
                # Unknown command
                print(f"Unknown command: {user_input}")
                print("Type 'help' for available commands")
                
            except KeyboardInterrupt:
                print("\nGoodbye!")
                break
            except EOFError:
                print("\nGoodbye!")
                break

if __name__ == "__main__":
    cli = BezierCityCLI()
    cli.run()