# imports
import os
from flask import Flask, jsonify, render_template, request
from flask_cors import CORS
from flask_pymongo import ObjectId, PyMongo


# initialize and configure application
app = Flask(__name__)

app.config['DEBUG'] = True
app.config['MONGO_URI'] = os.environ.get('MONGO_URI')


# initialize and configure database client
mongo = PyMongo(app)


# enable Cross-Origin Resource Sharing
CORS(app)


# configurations
EXCLUDED_COLLECTION_NAMES = ['access_keys']


# validate access key
def validate_access_key(access_key):
    collection = mongo.db.get_collection('access_keys')
    result = collection.find_one({'access_key': access_key})
    if result is None:
        return False
    return True


# validate annotation
def validate_annotation(annotation):
    if not (isinstance(annotation, dict) and len(annotation) > 0):
        return False
    for key, value in annotation.items():
        if not (isinstance(key, str) and isinstance(value, bool)):
            return False
    return True


# define routes
@app.route('/', methods=['GET'])
def index():
    return render_template('index.html')


@app.route('/login', methods=['POST'])
def login():
    collection = mongo.db.get_collection('access_keys')
    access_key = request.json['access_key']
    result = collection.find_one({'access_key': access_key})
    if result is None:
        return jsonify({'success': False})
    return jsonify({'success': True, 'access_key': access_key, 'allocated_to': result['allocated_to']})


@app.route('/connect', methods=['POST'])
def connect():
    access_key = request.json['access_key']
    if validate_access_key(access_key):
        collection_names = sorted(list(mongo.db.list_collection_names()))
        databases = []
        for collection_name in collection_names:
            if collection_name in EXCLUDED_COLLECTION_NAMES:
                continue
            collection = mongo.db.get_collection(collection_name)
            images_remaining = collection.count_documents({'updated_by': '', 'deleted_by': ''})
            databases.append({
                'database_id': collection_name,
                'database_name': collection_name.replace('_', ' ').upper(),
                'images_remaining': images_remaining
            })
        return jsonify({'success': True, 'databases': databases})
    return jsonify({'success': False})


@app.route('/read', methods=['POST'])
def read():
    access_key = request.json['access_key']
    collection_name = request.json['database_id']
    if validate_access_key(access_key) and collection_name not in EXCLUDED_COLLECTION_NAMES:
        collection = mongo.db.get_collection(collection_name)
        result_1 = collection.find_one_and_update({'locked_by': access_key}, {'$set': {'locked_by': ''}})
        if result_1 is None:
            result_2 = collection.find_one_and_update({'locked_by': '', 'updated_by': '', 'deleted_by': ''}, {'$set': {'locked_by': access_key}})
        else:
            result_2 = collection.find_one_and_update({'_id': {'$gt': result_1['_id']}, 'locked_by': '', 'updated_by': '', 'deleted_by': ''}, {'$set': {'locked_by': access_key}})
        if result_2 is not None:
            return jsonify({'success': True, 'image_id': str(result_2['_id']), 'image_url': result_2['image_url']})
    return jsonify({'success': False})


@app.route('/update', methods=['POST'])
def update():
    access_key = request.json['access_key']
    collection_name = request.json['database_id']
    image_id = request.json['image_id']
    annotation = request.json['annotation']
    if validate_access_key(access_key) and collection_name not in EXCLUDED_COLLECTION_NAMES and validate_annotation(annotation):
        collection = mongo.db.get_collection(collection_name)
        result = collection.find_one_and_update({'_id': ObjectId(image_id)}, {'$set': {'updated_by': access_key, 'annotation': annotation}})
        if result is not None:
            return jsonify({'success': True})
    return jsonify({'success': False})


@app.route('/delete', methods=['POST'])
def delete():
    access_key = request.json['access_key']
    collection_name = request.json['database_id']
    image_id = request.json['image_id']
    if validate_access_key(access_key) and collection_name not in EXCLUDED_COLLECTION_NAMES:
        collection = mongo.db.get_collection(collection_name)
        result = collection.find_one_and_update({'_id': ObjectId(image_id)}, {'$set': {'deleted_by': access_key}})
        if result is not None:
            return jsonify({'success': True})
    return jsonify({'success': False})


@app.route('/status', methods=['POST'])
def status():
    access_key = request.json['access_key']
    collection_name = request.json['database_id']
    if validate_access_key(access_key) and collection_name not in EXCLUDED_COLLECTION_NAMES:
        collection = mongo.db.get_collection(collection_name)
        updated = collection.count_documents({'updated_by': access_key, 'deleted_by': ''})
        deleted = collection.count_documents({'deleted_by': access_key})
        return jsonify({'success': True, 'updated': updated, 'deleted': deleted})
    return jsonify({'success': False})


# run application
if __name__ == '__main__':
    app.run()
