#!/usr/bin/env python3
"""
Extract street data from bezier_city_full.json

Usage:
    python extract_street.py <street_id>
    python extract_street.py --all
"""

import json
import sys
import argparse

def load_city_data(filename='bezier_city_full.json'):
    """Load city data from JSON file"""
    with open(filename, 'r') as f:
        return json.load(f)

def extract_street(data, street_id):
    """Extract a specific street by ID"""
    for street in data['streets']:
        if street['id'] == street_id:
            return street
    return None

def extract_street_with_edges(data, street_id):
    """Extract a street and all its associated edges"""
    street = extract_street(data, street_id)
    if street is None:
        return None
    
    # Get all edges referenced by this street
    edge_ids = street.get('edge_ids', [])
    edges = []
    
    if 'edges' in data:
        for edge in data['edges']:
            if edge['id'] in edge_ids:
                edges.append(edge)
    
    return {
        'street': street,
        'edges': edges
    }

def extract_all_streets(data):
    """Extract all streets"""
    return data['streets']

def main():
    parser = argparse.ArgumentParser(description='Extract street data from bezier_city_full.json')
    parser.add_argument('street_id', type=int, nargs='?', help='Street ID to extract')
    parser.add_argument('--all', action='store_true', help='Extract all streets')
    parser.add_argument('--with-edges', action='store_true', help='Include edge data for the street')
    parser.add_argument('--output', '-o', help='Output to file instead of stdout')
    parser.add_argument('--compact', action='store_true', help='Compact JSON output')
    
    args = parser.parse_args()
    
    if not args.all and args.street_id is None:
        parser.print_help()
        sys.exit(1)
    
    try:
        data = load_city_data()
        
        if args.all:
            result = extract_all_streets(data)
            print(f"Found {len(result)} streets")
        else:
            if args.with_edges:
                result = extract_street_with_edges(data, args.street_id)
                if result is None:
                    print(f"Street {args.street_id} not found", file=sys.stderr)
                    sys.exit(1)
                print(f"Street {args.street_id} extracted with {len(result['edges'])} edges")
            else:
                result = extract_street(data, args.street_id)
                if result is None:
                    print(f"Street {args.street_id} not found", file=sys.stderr)
                    sys.exit(1)
                print(f"Street {args.street_id} extracted")
        
        # Format JSON output
        if args.compact:
            json_output = json.dumps(result)
        else:
            json_output = json.dumps(result, indent=2)
        
        # Output to file or stdout
        if args.output:
            with open(args.output, 'w') as f:
                f.write(json_output)
            print(f"Data written to {args.output}")
        else:
            print(json_output)
            
    except FileNotFoundError:
        print("Error: bezier_city_full.json not found", file=sys.stderr)
        sys.exit(1)
    except json.JSONDecodeError as e:
        print(f"Error parsing JSON: {e}", file=sys.stderr)
        sys.exit(1)
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()