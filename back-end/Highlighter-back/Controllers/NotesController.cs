using Microsoft.AspNetCore.Mvc;
using System.Text.Json;


namespace Highlighter_back.Controllers
{
    [ApiController]
    [Route("api/[controller]")]
    public class NotesController : ControllerBase
    {
        private readonly string? _notesDirectory;

        public NotesController(IConfiguration config, IWebHostEnvironment env)
        {
            _notesDirectory = config["Notes:Path"];
        }

        [HttpGet]
        public async Task<IActionResult> GetAllNotes()
        {
            if (string.IsNullOrEmpty(_notesDirectory))
                return BadRequest("Путь к заметкам не настроен");

            if (!Directory.Exists(_notesDirectory))
                return NotFound("Каталог заметок не найден");

            var files = Directory.GetFiles(_notesDirectory, "*.json").OrderBy(f => f).ToArray();
            var notes = new List<JsonElement>();
            foreach (var file in files)
            {
                try
                {
                    var text = await System.IO.File.ReadAllTextAsync(file);
                    var note = JsonSerializer.Deserialize<JsonElement>(text);
                    notes.Add(note);
                }
                catch
                {
                }
            }

            return Ok(notes);
        }

        [HttpDelete("{id}")]
        public void DeleteNote(string id)
        {
            
        }
    }
}
