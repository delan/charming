var	ucd_version = '6.2.0',
	grid_elements = [],
	grid_base,
	current_cp,
	data_ready = false,
	data = [],
	data_files = [{
		name: 'Symbola.ttf'
	}, {
		name: 'UnicodeData.txt',
		handler: function(s) {
			s = s.split('\n');
			s.pop();
			s.forEach(function(l) {
				l = l.split(';');
				var cp = parseInt(l[0], 16);
				set_data(cp, 'name', l[1]);
				set_data(cp, 'gc', l[2]);
			});
		}
	}, {
		name: 'Blocks.txt',
		handler: function(s) {
			s.split('\n').filter(function(l) {
				return /^[0-9A-F]/. test(l);
			}).forEach(function(l) {
				l = l.split(/\.\.|; /);
				var a = parseInt(l[0], 16);
				var b = parseInt(l[1], 16);
				for (; a <= b; a++)
					set_data(a, 'block', l[2]);
			});
		}
	}, {
		name: 'DerivedAge.txt',
		handler: function(s) {
			s.split('\n').filter(function(l) {
				return /^[0-9A-F]/.test(l);
			}).forEach(function(l) {
				l = l.split(/\.\.|\s*; | #/);
				var a = parseInt(l[0], 16);
				var b = parseInt(l[1], 16);
				for (; a <= b; a++)
					set_data(a, 'age', 'Unicode ' + l[2]);
			});
		}
	}, {
		name: 'NameAliases.txt',
		handler: function(s) {
			s.split('\n').filter(function(l) {
				return /^[0-9A-F]/.test(l);
			}).forEach(function(l) {
				l = l.split(';');
				var cp = parseInt(l[0], 16);
				var n = get_data(cp, 'name');
				if (l[2] != 'control' || n != '<control>')
					return;
				set_data(cp, 'name', l[1]);
			});
		}
	}, {
		name: 'PropertyValueAliases.txt',
		handler: function(s) {
			var gc_map = {};
			s.split('\n').filter(function(l) {
				return /^gc ; /.test(l);
			}).forEach(function(l) {
				l = l.split(/;|#/);
				gc_map[l[1].trim()] = l[2].trim().
					replace('_', ' ');
			});
			for (var i = 0; i <= 0x10ffff; i++) {
				set_data(i, 'cp', i);
				set_data(i, 'gc', gc_map[get_data(i, 'gc')]);
			}
		}
	}, {
		name: 'Unihan_Readings.txt',
		handler: function(s) {
			s.split('\n').filter(function(l) {
				return /^U\+[0-9A-F]{4,6}\tkDefinition\t/.
					test(l);
			}).forEach(function(l) {
				l = l.split('\t');
				var cp = parseInt(l[0].substr(2), 16);
				set_data(cp, 'name', l[2]);
				set_data(cp, 'han', true);
			});
			s.split('\n').filter(function(l) {
				return /^U\+[0-9A-F]{4,6}\tkMandarin\t/.
					test(l);
			}).forEach(function(l) {
				l = l.split('\t');
				var cp = parseInt(l[0].substr(2), 16);
				set_data(cp, 'mpy', l[2]);
			});
		}
	}],
	data_defaults = {
		name: '(unknown or unassigned)',
		u16: function(cp) {
			return cp_char(cp).split('').map(function(x) {
				return ('0000' + x.charCodeAt(0).toString(16).
					toUpperCase()).slice(-4);
			}).join(' ');
		},
		u8: function(cp) {
			return unescape(encodeURIComponent(cp_char(cp))).
				split('').map(function(x) {
					return ('00' + x.charCodeAt(0).
						toString(16).toUpperCase()).
						slice(-2);
				}).join(' ');
		},
		ent: function(cp) {
			return '&#' + cp + ';';
		},
		block: '(unknown or unassigned)',
		age: '(unknown or unassigned)',
		gc: 'Cn',
		mpy: '(not applicable)'
	};

function init_grid() {
	var row, cell, div;
	for (var i = 0; i < 256; i++) {
		if (i % 16 == 0) {
			row = $('<tr>');
			$('#grid').append(row);
		}
		cell = $('<td>');
		div = $('<div>');
		div.attr('id', 'g' + i);
		div.click(click_handler);
		cell.append(div);
		row.append(cell);
		grid_elements.push(div);
	}
}

function cp_char(cp) {
	if (cp > 0xffff) {
		cp -= 0x10000;
		return String.fromCharCode(
			0xd800 + (cp >> 10),
			0xdc00 + (cp & 0x3ff)
		);
	} else {
		return String.fromCharCode(cp);
	}
}

function cp_string(cp) {
	var s = cp.toString(16).toUpperCase();
	if (s.length < 5)
		s = ('000' + s).slice(-4);
	return 'U+' + s;
}

function update_grid() {
	grid_elements.forEach(function(e, i) {
		var cp = grid_base + i;
		e.text(cp_char(cp));
	});
}

function update_info() {
	var cp = current_cp;
	$('#cp').text(cp_string(cp));
	$('#big').text(cp_char(cp));
	if (!data_ready)
		return;
	for (var x in data_defaults)
		$('#data_' + x).text(get_data(cp, x));
}

function set_hash(cp) {
	location.hash = cp.toString(16);
}

function hashchange_handler() {
	var cp = parseInt(location.hash.substr(1), 16);
	if (isNaN(cp) || cp < 0 || cp > 0x10ffff)
		if (current_cp == undefined)
			return set_hash(0);
		else if (!location.hash.length)
			return;
		else
			return set_hash(current_cp);
	current_cp = cp;
	var new_grid_base = cp - cp % 256;
	if (new_grid_base != grid_base) {
		grid_base = new_grid_base;
		update_grid();
	}
	$('#goto_hex').val(cp.toString(16));
	$('#goto_dec').val(cp);
	$('#goto_char').val(cp_char(cp));
	$('#grid div').removeClass('selected');
	grid_elements[cp % 256].addClass('selected');
	update_info();
}

function click_handler() {
	var i = parseInt(this.id.substr(1));
	set_hash(grid_base + i);
}

function load_data() {
	$('#loading_noscript').hide();
	$('#loading_files').show();
	$('#loading_file_b').text(data_files.length);
	load_data_next();
}

function load_data_next() {
	if (!data_files.length) {
		data_ready = true;
		$('#loading').hide();
		$('#ui').show();
		update_info();
		return;
	}
	var data_file = data_files.shift();
	var a = parseInt($('#loading_file_a').text());
	$('#loading_file_a').text(a + 1);
	$('#loading_file_name').text(data_file.name);
	$.ajax({
		url: 'data/' + data_file.name,
		mimeType: 'text/plain',
		success: function(s) {
			if (data_file.handler)
				data_file.handler(s);
			load_data_next();
		}
	});
}

function get_data(cp, prop) {
	if (!data[cp] || !data[cp][prop]) {
		var def = data_defaults[prop];
		if (def instanceof Function)
			return def(cp);
		else
			return def;
	}
	return data[cp][prop];
}

function set_data(cp, prop, value) {
	if (!data[cp])
		data[cp] = {};
	data[cp][prop] = value;
}

init_grid();
hashchange_handler();
load_data();

$(window).on('hashchange', hashchange_handler);
$(window).keydown(function(e) {
	if (e.metaKey || e.shiftKey || e.ctrlKey || e.altKey)
		return;
	switch (e.keyCode) {
	case 33: // page up
		set_hash(current_cp - 256); break;
	case 34: // page down
		set_hash(current_cp + 256); break;
	case 35: // end
		if (current_cp == grid_base + 255)
			set_hash(0x10ffff);
		else
			set_hash(grid_base + 255);
		break;
	case 36: // home
		if (current_cp == grid_base)
			set_hash(0);
		else
			set_hash(grid_base);
		break;
	case 37: // left arrow
		set_hash(current_cp - 1); break;
	case 38: // up arrow
		set_hash(current_cp - 16); break;
	case 39: // right arrow
		set_hash(current_cp + 1); break;
	case 40: // down arrow
		set_hash(current_cp + 16); break;
	}
});
$('input').keydown(function(e) {
	e.stopPropagation();
});
$('#ui_tabs a').click(function(e) {
	$('#ui_content > div').hide();
	$('#' + this.id.substr(4)).show();
	$('#ui_tabs a').removeClass('selected');
	$(this).addClass('selected');
	e.preventDefault();
});
$('#ucd_version').text(ucd_version);
$('#search_form, #search_han').on('submit change', function(e) {
	var q = $('#search_query').val();
	var sr = $('#search_results');
	if (!q.length)
		return;
	sr.empty();
	data.filter(function(o) {
		return (o.name || '').toLowerCase().indexOf(
			q.toLowerCase()) != -1;
	}).slice(0, 50).filter(function(o) {
		if (!$('#search_han').is(':checked') && o.han)
			return false;
		return true;
	}).forEach(function(o) {
		sr.append(
			$('<div>').
			text(cp_string(o.cp) + '\u2001' + o.name).
			click(function() {
				set_hash(o.cp);
			})
		);
	});
	e.preventDefault();
});
$('#goto_hex').on('change keydown paste input', function() {
	if (this.value.length == 0)
		return;
	set_hash(parseInt(this.value, 16));
});
$('#goto_dec').on('change keydown paste input', function() {
	if (this.value.length == 0)
		return;
	set_hash(parseInt(this.value, 10));
});
$('#goto_char').on('change keydown paste input', function() {
	if (this.value.length == 0)
		return;
	else if (this.value.length == 1)
		set_hash(this.value.charCodeAt(0));
	else
		set_hash(
			0x10000 +
			((this.value.charCodeAt(0) - 0xd800) << 10) +
			(this.value.charCodeAt(1) - 0xdc00)
		);
});
$('#goto_char').on('focus click', function() {
	// select entire box, even when there is only an invisible character
	// this prevents confusion when inputing in a seemingly empty box fails
	$(this).select();
});
