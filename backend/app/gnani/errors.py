class GnaniError(Exception):
    def __init__(self, code: str, user_message: str, status: int = 502):
        super().__init__(user_message)
        self.code, self.user_message, self.status = code, user_message, status
