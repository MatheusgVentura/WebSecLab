from django.db import models


class Comment(models.Model):
    author_name = models.CharField(max_length=120)
    content = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return f"{self.author_name}: {self.content[:30]}"
