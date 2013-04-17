from ggrc import db
from .mixins import Base, Described

class Transaction(Base, Described, db.Model):
  __tablename__ = 'transactions'

  title = db.Column(db.String)
  system_id = db.Column(db.Integer)