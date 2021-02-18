from flask import Flask
from flask import request, jsonify, make_response, render_template, send_from_directory
import json
import os
from werkzeug.routing import BaseConverter
from flask_cors import CORS, cross_origin
from itertools import chain
import copy



app = Flask(__name__, template_folder='build', static_folder='build/static')
CORS(app)

class RegexConverter(BaseConverter):
  def __init__(self, url_map, *items):
    super(RegexConverter, self).__init__(url_map)
    self.regex = items[0]

app.url_map.converters['regex'] = RegexConverter

@app.route("/<regex(r'(.*?)\.(json|txt|png|ico|js)$'):file>", methods=["GET"])
def public(file):
  return send_from_directory('./build', file)

@app.route('/')
def home():
  return render_template("index.html", name=None)

def iterate_line(board, row, sqr, increment_row, increment_sqr, current_player, number_row, number_sqr):
  board = board.copy()
  new_row = row + increment_row
  new_sqr = sqr + increment_sqr
  if (new_row < number_row and new_sqr < number_sqr and new_row >=0 
      and new_sqr >=0 and board[new_row][new_sqr] == current_player):
    return iterate_line(board, new_row, new_sqr, increment_row, increment_sqr, current_player, number_row, number_sqr)
  else:
    return sqr if increment_row == 0 else row


def gameover(board, current_row, current_sqr, number_row, number_sqr, get_positions):
  current_player = board[current_row][current_sqr]

  left_horizontal  = iterate_line(board, current_row, current_sqr,  1,  0, current_player, number_row, number_sqr)
  right_horizontal = iterate_line(board, current_row, current_sqr, -1,  0, current_player, number_row, number_sqr)
  bottom_vertical  = iterate_line(board, current_row, current_sqr,  0,  1, current_player, number_row, number_sqr)
  top_vertical     = iterate_line(board, current_row, current_sqr,  0, -1, current_player, number_row, number_sqr)
  bottom_diagonal  = iterate_line(board, current_row, current_sqr,  1,  1, current_player, number_row, number_sqr)
  top_diagonal     = iterate_line(board, current_row, current_sqr, -1, -1, current_player, number_row, number_sqr)
  br_anti_diagonal = iterate_line(board, current_row, current_sqr,  1, -1, current_player, number_row, number_sqr)
  tl_anti_diagonal = iterate_line(board, current_row, current_sqr, -1,  1, current_player, number_row, number_sqr)

  horizontal_length    = 1 + left_horizontal  - right_horizontal
  vertical_length      = 1 + bottom_vertical  - top_vertical
  diagonal_length      = 1 + bottom_diagonal  - top_diagonal
  anti_diagonal_length = 1 + br_anti_diagonal - tl_anti_diagonal

  if not get_positions: 
    if(horizontal_length >= 4 or vertical_length      >= 4 or 
      diagonal_length   >= 4 or anti_diagonal_length >= 4):
      return True
    else: return False

  elif horizontal_length      >= 4:
    first_row = right_horizontal
    first_sqr = current_sqr
    last_row  = left_horizontal
    last_sqr  = current_sqr

    positions = []
    while first_row <= last_row and first_sqr <= last_sqr:
      positions.append([first_row, first_sqr])
      first_row += 1
    return True, positions

  elif vertical_length      >= 4:
    first_row = current_row
    first_sqr = top_vertical
    last_row  = current_row
    last_sqr  = bottom_vertical

    positions = []
    while first_row <= last_row and first_sqr <= last_sqr:
      positions.append([first_row, first_sqr])
      first_sqr += 1
    return True, positions

  elif diagonal_length      >= 4:
    first_row = top_diagonal
    first_sqr = current_sqr - (current_row - first_row)
    last_row  = bottom_diagonal
    last_sqr  = current_sqr + (last_row - current_row)

    positions = []
    while first_row <= last_row and first_sqr <= last_sqr:
      positions.append([first_row, first_sqr])
      first_sqr += 1
      first_row += 1
    return True, positions

  elif anti_diagonal_length >= 4:
    first_row = tl_anti_diagonal
    first_sqr = current_sqr + (current_row - first_row)
    last_row  = br_anti_diagonal
    last_sqr  = current_sqr - (last_row - current_row)

    positions = []
    while first_row <= last_row and first_sqr >= last_sqr:
      positions.append([first_row, first_sqr])
      first_sqr -= 1
      first_row += 1
    return True, positions

  else:
    return False, None

@app.route('/game', methods=['POST', 'GET'])
def check_gameover():
  content = request.get_json()
  board = content['board']
  last_row = content['lastRow']
  last_sqr = content['lastSqr']
  number_row = content['numberRow']
  number_sqr = content['numberSqr']

  if 0 not in chain(*board):
    response = {"gameOver": "tie", "positions": []}
  else:
    game_is_over, positions = gameover(board, last_row, last_sqr, number_row, number_sqr, True)
    response = {"gameOver": game_is_over, "positions": positions}

  return jsonify(response)

def random_play (board):
  for i, row in enumerate(board):
    if row[0] == 0:
      return i
  return None

def drop_coin (nrow, board, next_player):
  board = copy.deepcopy(board)
  row = board[nrow]

  for i in range(len(row)):
    if row[i] == 0 and (i == len(row)-1 or row[i+1] > 0):
      row[i] = next_player
      return board, nrow, i
  return None, None, None

def make_play (board, next_player, recursion_level, number_row, number_sqr, level):
  board = copy.deepcopy(board)
  if recursion_level > level:
    return "tie", 0.5, random_play(board)

  number_defeat = 0
  best_prob = 1
  number_full_rows = 0

  for i in range(number_row):
    new_board, row, sqr = drop_coin(i, board, next_player)
    if not new_board:
      number_full_rows += 1
      continue
    if gameover(new_board, row, sqr, number_row, number_sqr, False):
      return "winner", 1, i

    foe_play, prob_defeat, next_play = make_play(new_board,
                                                  2 if next_player == 1 else 1, 
                                                  recursion_level+1,
                                                  number_row,
                                                  number_sqr,
                                                  level)
    if   foe_play == "winner":
      number_defeat += 1
      if best_prob == 1:
        best_play = next_play
    elif foe_play == "looser":
      best_play = i
      best_prob = 0
    elif foe_play == "tie":
      number_defeat += prob_defeat
      if best_prob > prob_defeat:
        best_play = i
        best_prob = prob_defeat

    

  if number_full_rows == number_row:
    return "tie", 0.1, None
  if number_defeat == number_row - number_full_rows:
    return "looser", 0, best_play
  else:
    prob_defeat = 1 - number_defeat/(number_row - number_full_rows)
    return "tie", prob_defeat, best_play

@app.route('/opponent', methods=['POST', 'GET'])
def opponent():
  content = request.get_json()
  board           = content['board']
  next_player     = int(content['nextPlayer'])
  number_row      = int(content['numberRow'])
  number_sqr      = int(content['numberSqr'])
  dificulty_level = int(content['dificultyLevel'])

  _outcome, _prob, next_play = make_play(board, next_player, 0, number_row, number_sqr, dificulty_level)

  response = {"nextPlay": next_play}

  return jsonify(response)

# Run the application
if __name__ == "__main__":
    # Setting debug to True enables debug output. This line should be
    # removed before deploying a production application.
    app.debug = True
    app.run(host="0.0.0.0", debug=True)